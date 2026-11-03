"use client";

import { use, useCallback, useEffect, useState } from "react";
import { BasketCard } from "@/components/BasketCard";
import { Nav } from "@/components/Nav";
import { STATUS_LABEL, type BasketView } from "@/lib/types";

const STAGES = [
  { status: "paid", label: "Paid" },
  { status: "preparing", label: "Preparing" },
  { status: "delivered", label: "Delivered" },
] as const;

// Sender-side tracking: progress, delivery photo, timeline, refund if something went wrong.
export function BasketTracker({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [basket, setBasket] = useState<BasketView | null>(null);
  const [missing, setMissing] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      fetch(`/api/baskets/${id}`).then(async (res) => {
        if (res.status === 404) setMissing(true);
        else setBasket(await res.json());
      }),
    [id],
  );

  useEffect(() => {
    const tick = () => void load();
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [load]);

  // Coming back from PayPal approval (or opening a pending monthly basket): ask PayPal for the status.
  const pendingMonthly = Boolean(basket?.subscriptionId) && !["ACTIVE", "CANCELLED"].includes(basket?.subscriptionStatus ?? "");
  useEffect(() => {
    if (!pendingMonthly) return;
    fetch(`/api/baskets/${id}/subscription`).then(() => load());
  }, [pendingMonthly, id, load]);

  async function stopMonthly() {
    if (!confirm("Stop the monthly basket? No further payments will be taken.")) return;
    const res = await fetch(`/api/baskets/${id}/subscription`, { method: "DELETE" });
    const data = await res.json();
    if (!data.ok) setError(data.error);
    load();
  }

  async function refund() {
    const reason = prompt("What went wrong? (optional)") ?? "";
    setRefunding(true);
    const res = await fetch(`/api/baskets/${id}/refund`, { method: "POST", body: JSON.stringify({ reason }) });
    const data = await res.json();
    setRefunding(false);
    if (!data.ok) setError(data.error);
    load();
  }

  const reached = (status: string) => basket?.events.some((e) => e.status === status);

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-16">
      <Nav />
      {missing && <p>This basket does not exist.</p>}
      {!basket && !missing && <p className="text-muted">Loading basket…</p>}
      {basket && (
        <>
          <p className="text-sm font-medium uppercase tracking-wide text-clay">{STATUS_LABEL[basket.status]}</p>
          <h1 className="font-display text-3xl font-semibold">Basket for {basket.recipientName}</h1>
          <p className="mb-6 text-muted">
            {basket.recipientCity} · ${basket.totalUsd}
          </p>

          {basket.status === "refunded" ? (
            <div className="mb-6 rounded-2xl border border-sand bg-paper p-4 text-sm">
              This basket was refunded in full through PayPal.
            </div>
          ) : (
            <ol className="mb-8 grid grid-cols-3 gap-2">
              {STAGES.map((s) => {
                const done = reached(s.status);
                return (
                  <li key={s.status}>
                    <div className={`h-1.5 rounded-full ${done ? "bg-leaf" : "bg-sand"}`} />
                    <p className={`mt-2 text-sm ${done ? "font-medium text-leaf" : "text-muted"}`}>{s.label}</p>
                  </li>
                );
              })}
            </ol>
          )}

          {basket.deliveryPhoto && (
            <figure className="mb-6 overflow-hidden rounded-2xl border border-sand bg-paper shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL proof photo */}
              <img src={basket.deliveryPhoto} alt={`Delivery to ${basket.recipientName}`} className="w-full" />
              <figcaption className="flex items-center justify-between gap-3 p-4 text-sm">
                <span className="font-medium text-leaf">Delivered to {basket.recipientName}</span>
                <span className="text-muted">Tracking {basket.trackingNumber}</span>
              </figcaption>
            </figure>
          )}

          <div className="mb-6">
            <BasketCard title="What's in the basket" lines={basket.lines} totalUsd={basket.totalUsd} merchants={basket.merchants} />
          </div>

          {basket.subscriptionId && (
            <section className="mb-6 rounded-2xl border border-sand bg-paper p-5 text-sm">
              <h2 className="font-display text-lg font-semibold">Monthly basket</h2>
              <p className="mt-1 text-muted">
                {basket.subscriptionStatus === "ACTIVE"
                  ? `Active · next basket ${basket.nextBillingAt ? new Date(basket.nextBillingAt).toLocaleDateString() : "next month"}`
                  : (basket.subscriptionStatus ?? "Pending approval").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </p>
              <p className="text-xs text-muted">PayPal subscription {basket.subscriptionId}</p>
              {basket.subscriptionStatus === "ACTIVE" && (
                <button onClick={stopMonthly} className="mt-3 text-clay-dark underline">
                  Stop the monthly basket
                </button>
              )}
            </section>
          )}

          <section className="mb-8">
            <h2 className="mb-3 font-display text-lg font-semibold">Timeline</h2>
            <ol className="space-y-4 border-l-2 border-sand pl-5">
              {basket.events.map((e, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-cream bg-ochre" />
                  <p>
                    <span className="font-medium">{STATUS_LABEL[e.status]}</span>{" "}
                    <span className="text-muted">· {new Date(e.at).toLocaleString()}</span>
                  </p>
                  {e.note && <p className="text-muted">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          {basket.captureId && ["paid", "preparing", "delivered"].includes(basket.status) && (
            <button onClick={refund} disabled={refunding} className="text-sm text-clay-dark underline disabled:opacity-50">
              {refunding ? "Refunding…" : "Something went wrong? Get a full refund via PayPal"}
            </button>
          )}
          {error && <p className="mt-2 text-sm text-clay-dark">{error}</p>}
        </>
      )}
    </main>
  );
}
