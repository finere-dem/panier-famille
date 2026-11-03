import type { Basket } from "./store";

/** Basket as returned by the API (merchant names resolved). */
export type BasketView = Basket & { merchants: string[]; hasPhoto?: boolean };

export const STATUS_LABEL: Record<Basket["status"], string> = {
  proposed: "Proposed",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  preparing: "Being prepared",
  delivered: "Delivered",
  refunded: "Refunded",
};

export const STATUS_PILL: Record<Basket["status"], string> = {
  proposed: "bg-line text-muted",
  awaiting_payment: "bg-line text-muted",
  paid: "bg-saffron/25 text-ink",
  preparing: "bg-ink/10 text-ink",
  delivered: "bg-leaf-soft text-leaf",
  refunded: "bg-line text-muted",
};
