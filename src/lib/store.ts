import { neon } from "@neondatabase/serverless";

// Baskets live in Postgres (Neon) when DATABASE_URL is set, and in memory otherwise,
// so the project runs locally with zero setup. Each basket is one JSONB document.

export type BasketLine = { productId: string; name: string; unit: string; merchantId: string; quantity: number; unitPriceUsd: number };

export type BasketStatus = "proposed" | "awaiting_payment" | "paid" | "preparing" | "delivered" | "refunded";

export type BasketEvent = { at: string; status: BasketStatus; note?: string };

export type Basket = {
  id: string;
  recipientName: string;
  recipientCity: string;
  budgetUsd: number;
  lines: BasketLine[];
  totalUsd: number;
  note: string;
  status: BasketStatus;
  createdAt: string;
  events: BasketEvent[];
  paypalOrderId?: string;
  captureId?: string;
  deliveryPhoto?: string; // data URL, resized client-side
  trackingNumber?: string;
  refundId?: string;
  subscriptionId?: string;
  subscriptionStatus?: string; // PayPal status: APPROVAL_PENDING, ACTIVE, CANCELLED...
  nextBillingAt?: string;
};

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

const g = globalThis as unknown as { __baskets?: Map<string, Basket>; __schema?: Promise<unknown> };
const memory = (g.__baskets ??= new Map<string, Basket>());

function ready() {
  g.__schema ??= sql!`CREATE TABLE IF NOT EXISTS baskets (
    id TEXT PRIMARY KEY,
    paypal_order_id TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    data JSONB NOT NULL
  )`;
  return g.__schema;
}

export async function saveBasket(b: Basket) {
  if (!sql) {
    memory.set(b.id, b);
    return b;
  }
  await ready();
  await sql`INSERT INTO baskets (id, paypal_order_id, created_at, data)
    VALUES (${b.id}, ${b.paypalOrderId ?? null}, ${b.createdAt}, ${JSON.stringify(b)})
    ON CONFLICT (id) DO UPDATE SET paypal_order_id = EXCLUDED.paypal_order_id, data = EXCLUDED.data`;
  return b;
}

export async function getBasket(id: string): Promise<Basket | undefined> {
  if (!sql) return memory.get(id);
  await ready();
  const rows = await sql`SELECT data FROM baskets WHERE id = ${id}`;
  return rows[0]?.data as Basket | undefined;
}

export async function findBasketByOrder(orderId: string): Promise<Basket | undefined> {
  if (!sql) return [...memory.values()].find((b) => b.paypalOrderId === orderId);
  await ready();
  const rows = await sql`SELECT data FROM baskets WHERE paypal_order_id = ${orderId}`;
  return rows[0]?.data as Basket | undefined;
}

export async function listBaskets(): Promise<Basket[]> {
  if (!sql) return [...memory.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await ready();
  const rows = await sql`SELECT data FROM baskets ORDER BY created_at DESC LIMIT 200`;
  return rows.map((r) => r.data as Basket);
}

/** Move a basket to a new status and append it to the timeline. */
export function advance(b: Basket, status: BasketStatus, patch: Partial<Basket> = {}, note?: string) {
  return saveBasket({ ...b, ...patch, status, events: [...b.events, { at: new Date().toISOString(), status, note }] });
}
