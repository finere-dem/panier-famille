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
