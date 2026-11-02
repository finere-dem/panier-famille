import type { NextRequest } from "next/server";
import { findMerchant } from "@/lib/catalog";
import { getBasket } from "@/lib/store";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/baskets/[id]">) {
  const { id } = await ctx.params;
  const b = getBasket(id);
  if (!b) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ...b, merchants: [...new Set(b.lines.map((l) => findMerchant(l.merchantId)?.name))] });
}
