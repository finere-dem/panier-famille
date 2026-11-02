import type { NextRequest } from "next/server";
import { advance, getBasket } from "@/lib/store";

// Partner marks a paid basket as being prepared.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/baskets/[id]/status">) {
  const { id } = await ctx.params;
  const b = await getBasket(id);
  if (!b) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  if (b.status !== "paid") return Response.json({ ok: false, error: `Basket is ${b.status}` }, { status: 409 });
  await advance(b, "preparing", {}, "Merchants are preparing the basket");
  return Response.json({ ok: true });
}
