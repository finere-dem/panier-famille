import { callPaypal } from "./paypal";
import { advance, saveBasket, type Basket } from "./store";

// One PayPal catalog product backs every monthly basket; each basket gets its own plan at its own price.
const g = globalThis as unknown as { __pfProductId?: string };

async function productId() {
  if (!g.__pfProductId) {
    const product = await callPaypal<{ id: string }>("create_product", {
      name: "Panier Famille monthly basket",
      type: "PHYSICAL",
      description: "Essentials delivered every month to a family in Bamako by local merchants",
    });
    g.__pfProductId = product.id;
  }
  return g.__pfProductId;
}

type Link = { href: string; rel: string };

/** Create a monthly PayPal plan at the basket price and a subscription the sender must approve. */
export async function startMonthly(basket: Basket, origin: string) {
  const plan = await callPaypal<{ id: string }>("create_subscription_plan", {
    product_id: await productId(),
    name: `Monthly basket for ${basket.recipientName}`.slice(0, 127),
    description: basket.lines.map((l) => `${l.quantity}x ${l.name}`).join(", ").slice(0, 127),
    billing_cycles: [
      {
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { currency_code: "USD", value: basket.totalUsd.toFixed(2) } },
      },
    ],
    payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 2 },
  });

  const sub = await callPaypal<{ id: string; status: string; links: Link[] }>("create_subscription", {
    plan_id: plan.id,
    application_context: {
      brand_name: "Panier Famille",
      user_action: "SUBSCRIBE_NOW",
      return_url: `${origin}/baskets/${basket.id}?subscription=approved`,
      cancel_url: `${origin}/baskets/${basket.id}?subscription=cancelled`,
    },
  });

  const approveUrl = sub.links.find((l) => l.rel === "approve")?.href;
  await saveBasket({ ...basket, subscriptionId: sub.id, subscriptionStatus: sub.status });
  return { subscriptionId: sub.id, approveUrl };
}

/** Pull the subscription status from PayPal; the first approval counts as the first month's payment. */
export async function syncSubscription(basket: Basket) {
  if (!basket.subscriptionId) return basket;
  const sub = await callPaypal<{ status: string; billing_info?: { next_billing_time?: string } }>("show_subscription_details", {
    subscription_id: basket.subscriptionId,
  });
  const patch = { subscriptionStatus: sub.status, nextBillingAt: sub.billing_info?.next_billing_time };
  if (sub.status === "ACTIVE" && ["proposed", "awaiting_payment"].includes(basket.status)) {
    return advance(basket, "paid", patch, `Monthly basket active (PayPal subscription ${basket.subscriptionId})`);
  }
  return saveBasket({ ...basket, ...patch });
}

export async function cancelMonthly(basket: Basket, reason: string) {
  await callPaypal("cancel_subscription", { subscription_id: basket.subscriptionId, payload: { reason } });
  return syncSubscription(basket);
}
