// In-memory store for the prototype. Replaced by Postgres (Neon) before deployment.

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
};

const g = globalThis as unknown as { __baskets?: Map<string, Basket> };
const baskets = (g.__baskets ??= new Map<string, Basket>());

export function saveBasket(b: Basket) {
  baskets.set(b.id, b);
  return b;
}

export function getBasket(id: string) {
  return baskets.get(id);
}

export function findBasketByOrder(orderId: string) {
  return [...baskets.values()].find((b) => b.paypalOrderId === orderId);
}

export function listBaskets() {
  return [...baskets.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Move a basket to a new status and append it to the timeline. */
export function advance(b: Basket, status: BasketStatus, patch: Partial<Basket> = {}, note?: string) {
  return saveBasket({ ...b, ...patch, status, events: [...b.events, { at: new Date().toISOString(), status, note }] });
}
