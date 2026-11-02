"use client";

import { PayPalButtons } from "@paypal/react-paypal-js";
import Link from "next/link";
import { useState } from "react";

// PayPal approval step: the agent created the order, the sender approves it here.
export function Checkout({ orderId, basketId, totalUsd }: { orderId: string; basketId: string; totalUsd: number }) {
  const [state, setState] = useState<"idle" | "paid" | "error">("idle");
  const [error, setError] = useState("");

  async function capture() {
    const res = await fetch(`/api/orders/${orderId}/capture`, { method: "POST" });
    const data = await res.json();
    if (data.ok) setState("paid");
    else {
      setState("error");
      setError(data.error ?? data.status);
    }
  }

  if (state === "paid") {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
        <p>Payment confirmed (${totalUsd}). The merchants in Bamako have been notified.</p>
        <Link href={`/baskets/${basketId}`} className="mt-2 inline-block font-medium underline">
          Track this basket
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="mb-3 text-sm text-zinc-600">Approve ${totalUsd} with PayPal. Nothing is charged until you confirm.</p>
      <PayPalButtons
        style={{ layout: "vertical", shape: "pill" }}
        createOrder={async () => orderId}
        onApprove={capture}
        onError={(err) => {
          setState("error");
          setError(String(err));
        }}
      />
      {state === "error" && (
        <p className="mt-2 text-sm text-red-600">
          Payment not confirmed: {error}.{" "}
          <button onClick={capture} className="font-medium underline">
            Check again
          </button>
        </p>
      )}
    </div>
  );
}
