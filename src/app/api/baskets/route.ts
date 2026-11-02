import { connection } from "next/server";
import { findMerchant } from "@/lib/catalog";
import { listBaskets } from "@/lib/store";

// Partner dashboard feed: every basket that was paid, without the heavy photo payload.
export async function GET() {
  await connection(); // always live: never prerender this list at build time
  const rows = (await listBaskets())
    .filter((b) => !["proposed", "awaiting_payment"].includes(b.status))
    .map(({ deliveryPhoto, ...b }) => ({
      ...b,
      hasPhoto: Boolean(deliveryPhoto),
      merchants: [...new Set(b.lines.map((l) => findMerchant(l.merchantId)?.name))],
    }));
  return Response.json(rows);
}
