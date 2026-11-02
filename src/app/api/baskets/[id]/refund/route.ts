import type { NextRequest } from "next/server";
import { callPaypal } from "@/lib/paypal";
import { advance, getBasket } from "@/lib/store";

// Sender asks for a refund (basket not delivered, or problem with it). Full refund through PayPal.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/baskets/[id]/refund">) {
  const { id } = await ctx.params;
  const b = getBasket(id);
  if (!b) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!b.captureId || b.status === "refunded") {
    return Response.json({ ok: false, error: `Basket cannot be refunded (${b.status})` }, { status: 409 });
  }
  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string };

  try {
    const refund = await callPaypal<{ id: string; status: string }>("create_refund", {
      capture_id: b.captureId,
      note_to_payer: (reason || "Panier Famille refund").slice(0, 255),
    });
    advance(b, "refunded", { refundId: refund.id }, `Refunded via PayPal (${refund.status})${reason ? `: ${reason}` : ""}`);
    return Response.json({ ok: true, refundId: refund.id, status: refund.status });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
