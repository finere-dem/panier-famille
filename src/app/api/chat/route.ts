import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { findMerchant, findProduct, merchants, products } from "@/lib/catalog";
import { callPaypal, paypalTools } from "@/lib/paypal";
import { advance, getBasket, saveBasket, type BasketLine } from "@/lib/store";
import { startMonthly } from "@/lib/subscriptions";

export const maxDuration = 60;

const SYSTEM = `You are Panier Famille, a shopping agent for people of the African diaspora who want to support their family back home with real goods instead of cash.

How you work:
- The sender tells you who the basket is for, what the family needs and a budget. Ask at most one short question if the recipient's name or the budget is missing.
- Only use products returned by search_catalog. Never invent products or prices.
- Build the basket with propose_basket. It computes the total from the catalog and refuses baskets over budget, so adjust quantities when it refuses.
- Explain your choices in 2-4 short lines (why these items, what is left of the budget).
- When the sender agrees to a one-time basket, call create_checkout. If they want it every month, call start_monthly_basket instead (a PayPal subscription billed monthly, cancellable anytime). You never pay yourself: the sender approves with PayPal.
- When proposing a basket, end by asking whether to send it once or every month.
- Prescription medicine is never sold directly: use the pharmacy voucher, which the pharmacist redeems against the recipient's own prescription.
- Reply in the sender's language. Be warm and concise.`;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Thinking blocks from earlier turns are signed against the exact history they came from.
  // Once the client replays a turn slightly differently (e.g. after a failed tool call), the API
  // rejects them, so earlier reasoning is dropped: the model does not need it across turns.
  const history = messages.map((m) => ({ ...m, parts: m.parts.filter((p) => p.type !== "reasoning") }));

  const result = streamText({
    model: anthropic(process.env.AGENT_MODEL ?? "claude-haiku-5-5"),
    system: SYSTEM,
    messages: await convertToModelMessages(history),
    stopWhen: isStepCount(8),
    tools: {
      search_catalog: tool({
        description: "List the products available from partner merchants in Bamako, optionally filtered by category.",
        inputSchema: z.object({
          category: z.enum(["staples", "cooking", "hygiene", "baby", "health", "energy"]).optional(),
        }),
        execute: async ({ category }) =>
          products
            .filter((p) => !category || p.category === category)
            .map((p) => ({ ...p, merchant: findMerchant(p.merchantId)?.name })),
      }),

      propose_basket: tool({
        description: "Create a basket for a recipient. Prices are taken from the catalog; the basket is refused if the total exceeds the budget.",
        inputSchema: z.object({
          recipientName: z.string(),
          recipientCity: z.string().default("Bamako"),
          budgetUsd: z.number().positive(),
          items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
          note: z.string().default("").describe("Short note for the merchant or the family"),
        }),
        execute: async ({ recipientName, recipientCity, budgetUsd, items, note }) => {
          const lines: BasketLine[] = [];
          for (const item of items) {
            const p = findProduct(item.productId);
            if (!p) return { ok: false, error: `Unknown product ${item.productId}` };
            lines.push({ productId: p.id, name: p.name, unit: p.unit, merchantId: p.merchantId, quantity: item.quantity, unitPriceUsd: p.priceUsd });
          }
          const totalUsd = lines.reduce((s, l) => s + l.quantity * l.unitPriceUsd, 0);
          if (totalUsd > budgetUsd) {
            return { ok: false, error: `Total $${totalUsd} is over the $${budgetUsd} budget. Remove or reduce items.` };
          }
          const basket = await saveBasket({
            id: `bsk_${crypto.randomUUID().slice(0, 8)}`,
            recipientName,
            recipientCity,
            budgetUsd,
            lines,
            totalUsd,
            note,
            status: "proposed",
            createdAt: new Date().toISOString(),
            events: [{ at: new Date().toISOString(), status: "proposed" }],
          });
          return {
            ok: true,
            basket: {
              ...basket,
              merchants: [...new Set(lines.map((l) => l.merchantId))].map((id) => merchants.find((m) => m.id === id)?.name),
            },
          };
        },
      }),

      create_checkout: tool({
        description: "Create the PayPal order for an agreed basket. Returns the order the sender must approve with PayPal.",
        inputSchema: z.object({ basketId: z.string() }),
        execute: async ({ basketId }) => {
          const basket = await getBasket(basketId);
          if (!basket) return { ok: false, error: "Basket not found" };
          const order = await callPaypal<{ id: string; status: string }>("create_order", {
            currencyCode: "USD",
            items: basket.lines.map((l) => ({
              name: `${l.name} (${l.unit})`.slice(0, 127),
              quantity: l.quantity,
              itemCost: l.unitPriceUsd,
              itemTotal: l.unitPriceUsd * l.quantity,
              taxPercent: 0,
              description: `For ${basket.recipientName}, ${basket.recipientCity}`.slice(0, 127),
            })),
            notes: basket.note || undefined,
          });
          await advance(basket, "awaiting_payment", { paypalOrderId: order.id }, `PayPal order ${order.id}`);
          return { ok: true, basketId, orderId: order.id, totalUsd: basket.totalUsd };
        },
      }),

      start_monthly_basket: tool({
        description:
          "Turn an agreed basket into a monthly basket: creates a PayPal subscription billed every month at the basket price. Returns the PayPal approval link for the sender.",
        inputSchema: z.object({ basketId: z.string() }),
        execute: async ({ basketId }) => {
          const basket = await getBasket(basketId);
          if (!basket) return { ok: false, error: "Basket not found" };
          const { subscriptionId, approveUrl } = await startMonthly(basket, new URL(req.url).origin);
          return { ok: true, basketId, subscriptionId, approveUrl, monthlyUsd: basket.totalUsd };
        },
      }),

      ...paypalTools(["get_order"]),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
