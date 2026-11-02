"use client";

import { use, useCallback, useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { STATUS_LABEL, type BasketView } from "@/lib/types";

// Sender-side tracking: timeline, delivery photo, refund if something went wrong.
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-zinc-50 px-4 pb-16 pt-8 text-zinc-900">
      <Nav />
      {missing && <p>This basket does not exist.</p>}
      {basket && (
        <>
          <h1 className="text-2xl font-semibold">Basket for {basket.recipientName}</h1>
          <p className="mb-6 text-sm text-zinc-600">
            {basket.recipientCity} · ${basket.totalUsd} · {STATUS_LABEL[basket.status]}
          </p>

          {basket.deliveryPhoto && (
            <figure className="mb-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL proof photo */}
              <img src={basket.deliveryPhoto} alt={`Delivery to ${basket.recipientName}`} className="w-full" />
              <figcaption className="p-3 text-sm text-zinc-600">
                Proof of delivery · tracking {basket.trackingNumber}
              </figcaption>
            </figure>
          )}

          <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
            <ul className="space-y-1">
              {basket.lines.map((l) => (
                <li key={l.productId} className="flex justify-between gap-4">
                  <span>
                    {l.quantity} × {l.name} <span className="text-zinc-500">({l.unit})</span>
                  </span>
                  <span>${l.quantity * l.unitPriceUsd}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-500">From: {basket.merchants.join(", ")}</p>
          </section>

          <section className="mb-6">
            <h2 className="mb-2 font-medium">Timeline</h2>
            <ol className="space-y-2 border-l border-zinc-300 pl-4 text-sm">
              {basket.events.map((e, i) => (
                <li key={i}>
                  <span className="font-medium">{STATUS_LABEL[e.status]}</span>{" "}
                  <span className="text-zinc-500">{new Date(e.at).toLocaleString()}</span>
                  {e.note && <p className="text-zinc-600">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          {basket.subscriptionId && (
            <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
              <h2 className="mb-1 font-medium">Monthly basket</h2>
              <p className="text-zinc-600">
                PayPal subscription {basket.subscriptionId} · {basket.subscriptionStatus ?? "pending"}
                {basket.subscriptionStatus === "ACTIVE" && basket.nextBillingAt && (
                  <> · next basket {new Date(basket.nextBillingAt).toLocaleDateString()}</>
                )}
              </p>
              {basket.subscriptionStatus === "ACTIVE" && (
                <button onClick={stopMonthly} className="mt-2 text-red-700 underline">
                  Stop the monthly basket
                </button>
              )}
            </section>
          )}

          {basket.captureId && ["paid", "preparing", "delivered"].includes(basket.status) && (
            <button onClick={refund} disabled={refunding} className="text-sm text-red-700 underline disabled:opacity-50">
              {refunding ? "Refunding…" : "Something went wrong? Get a full refund via PayPal"}
            </button>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      )}
    </main>
  );
}
