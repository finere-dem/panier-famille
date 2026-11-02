import type { NextRequest } from "next/server";
import { callPaypal } from "@/lib/paypal";
import { advance, getBasket } from "@/lib/store";

// Partner confirms delivery with a photo. The delivery is also recorded on the PayPal
// transaction (shipment tracking), which strengthens seller protection against "item not received".
export async function POST(req: NextRequest, ctx: RouteContext<"/api/baskets/[id]/deliver">) {
  const { id } = await ctx.params;
  const b = await getBasket(id);
  if (!b) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!["paid", "preparing"].includes(b.status)) {
    return Response.json({ ok: false, error: `Basket is ${b.status}` }, { status: 409 });
  }
  const { photo } = (await req.json()) as { photo?: string };
  if (!photo?.startsWith("data:image/")) return Response.json({ ok: false, error: "A delivery photo is required" }, { status: 400 });

  const trackingNumber = `PF-${b.id.replace("bsk_", "").toUpperCase()}`;
  let paypalNote = "Delivery recorded on the PayPal transaction";
  try {
    await callPaypal("create_shipment_tracking", {
      order_id: b.paypalOrderId,
      transaction_id: b.captureId,
      tracking_number: trackingNumber,
      status: "DELIVERED",
      carrier: "OTHER",
    });
  } catch (e) {
    // The basket is delivered either way; keep the PayPal error visible in the timeline.
    paypalNote = `PayPal tracking not recorded: ${(e as Error).message.slice(0, 160)}`;
  }

  await advance(b, "delivered", { deliveryPhoto: photo, trackingNumber }, paypalNote);
  return Response.json({ ok: true, trackingNumber, paypalNote });
}
