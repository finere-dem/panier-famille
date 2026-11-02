import type { NextRequest } from "next/server";
import { getBasket } from "@/lib/store";
import { cancelMonthly, syncSubscription } from "@/lib/subscriptions";

// GET: refresh the monthly basket status from PayPal (called when the sender comes back from approval).
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/baskets/[id]/subscription">) {
  const { id } = await ctx.params;
  const b = await getBasket(id);
  if (!b?.subscriptionId) return Response.json({ ok: false, error: "No monthly basket" }, { status: 404 });
  try {
    const updated = await syncSubscription(b);
    return Response.json({ ok: true, status: updated.subscriptionStatus, nextBillingAt: updated.nextBillingAt });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

// DELETE: the sender stops the monthly basket.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/baskets/[id]/subscription">) {
  const { id } = await ctx.params;
  const b = await getBasket(id);
  if (!b?.subscriptionId) return Response.json({ ok: false, error: "No monthly basket" }, { status: 404 });
  try {
    const updated = await cancelMonthly(b, "Cancelled by the sender");
    return Response.json({ ok: true, status: updated.subscriptionStatus });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
