import type { NextRequest } from "next/server";
import { callPaypal } from "@/lib/paypal";
import { advance, findBasketByOrder } from "@/lib/store";

type CaptureResponse = {
  status: string;
  purchase_units?: { payments?: { captures?: { id: string }[] } }[];
};

// Called by the PayPal button once the sender approved the payment.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/orders/[id]/capture">) {
  const { id } = await ctx.params;
  const basket = findBasketByOrder(id);
  if (!basket) return Response.json({ ok: false, error: "Unknown order" }, { status: 404 });

  if (basket.status !== "awaiting_payment") {
    return Response.json({ ok: basket.status !== "proposed", status: basket.status, basketId: basket.id });
  }

  try {
    const capture = await callPaypal<CaptureResponse>("pay_order", { id });
    const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    if (capture.status === "COMPLETED") advance(basket, "paid", { captureId }, "Paid with PayPal");
    return Response.json({ ok: capture.status === "COMPLETED", status: capture.status, basketId: basket.id });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
