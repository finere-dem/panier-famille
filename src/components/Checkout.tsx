"use client";

import { DISPATCH_ACTION, PayPalButtons, SCRIPT_LOADING_STATE, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import Link from "next/link";
import { useEffect, useState } from "react";

// PayPal approval step: the agent created the order, the sender approves it here.
export function Checkout({ orderId, basketId, totalUsd }: { orderId: string; basketId: string; totalUsd: number }) {
  const [state, setState] = useState<"idle" | "paid" | "error">("idle");
  const [error, setError] = useState("");
  const [{ isRejected }, dispatch] = usePayPalScriptReducer();

  // The PayPal SDK is only loaded once a checkout is on screen (the provider defers loading).
  useEffect(() => {
    dispatch({ type: DISPATCH_ACTION.LOADING_STATUS, value: SCRIPT_LOADING_STATE.PENDING });
  }, [dispatch]);

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
      <div className="rounded-2xl border border-leaf/30 bg-leaf-soft p-5 text-leaf">
        <p className="font-display text-lg font-semibold">Payment confirmed · ${totalUsd}</p>
        <p className="mt-1 text-sm">The merchants in Bamako have been notified. You will get a photo when it is delivered.</p>
        <Link
          href={`/baskets/${basketId}`}
          className="mt-4 inline-block rounded-full bg-leaf px-4 py-2 text-sm font-semibold text-canvas hover:opacity-90"
        >
          Track this basket
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <p className="font-display text-lg font-semibold">Approve ${totalUsd} with PayPal</p>
      <p className="mb-4 mt-1 text-sm text-muted">Nothing is charged until you confirm. Covered by PayPal Buyer Protection.</p>
      {isRejected && (
        <p className="mb-2 text-sm text-red-700">
          PayPal could not be loaded (network issue).{" "}
          <button
            className="font-medium underline"
            onClick={() => dispatch({ type: DISPATCH_ACTION.LOADING_STATUS, value: SCRIPT_LOADING_STATE.PENDING })}
          >
            Retry
          </button>
        </p>
      )}
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
        <p className="mt-2 text-sm text-red-700">
          Payment not confirmed: {error}.{" "}
          <button onClick={capture} className="font-medium underline">
            Check again
          </button>
        </p>
      )}
    </div>
  );
}
