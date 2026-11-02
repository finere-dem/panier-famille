"use client";

import { useChat } from "@ai-sdk/react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useState } from "react";
import { Checkout } from "@/components/Checkout";
import { Markdown } from "@/components/Markdown";
import { Nav } from "@/components/Nav";

type BasketOutput = {
  ok: boolean;
  error?: string;
  basket?: {
    id: string;
    recipientName: string;
    recipientCity: string;
    budgetUsd: number;
    totalUsd: number;
    merchants: string[];
    lines: { productId: string; name: string; unit: string; quantity: number; unitPriceUsd: number }[];
  };
};

type CheckoutOutput = { ok: boolean; orderId?: string; basketId?: string; totalUsd?: number; error?: string };

type MonthlyOutput = { ok: boolean; approveUrl?: string; monthlyUsd?: number; error?: string };

const EXAMPLE =
  "Send my mother Fatoumata in Bamako what she needs for the month: rice, oil, sugar and her blood pressure medicine. Budget $80.";

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const busy = status === "submitted" || status === "streaming";

  // The agent proposed a basket in its last reply but no checkout exists yet: offer one-tap answers.
  const last = messages.at(-1);
  const awaitingConfirmation =
    !busy &&
    last?.role === "assistant" &&
    last.parts.some((p) => p.type === "tool-propose_basket" && p.state === "output-available" && (p.output as BasketOutput).ok) &&
    !last.parts.some((p) => p.type === "tool-create_checkout" || p.type === "tool-start_monthly_basket");

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, currency: "USD" }} deferLoading>
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col bg-zinc-50 px-4 pb-32 pt-8 text-zinc-900">
        <Nav />
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Send a basket, not cash</h1>
          <p className="text-sm text-zinc-600">Tell the agent what your family needs. They get real goods from local merchants, you get proof of delivery.</p>
        </header>

        {messages.length === 0 && (
          <button
            onClick={() => send(EXAMPLE)}
            className="mb-4 rounded-xl border border-dashed border-zinc-300 p-4 text-left text-sm text-zinc-700 hover:bg-white"
          >
            Try it: “{EXAMPLE}”
          </button>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "self-end max-w-[85%]" : "self-start w-full"}>
              {m.parts.map((part, i) => {
                const key = `${m.id}-${i}`;
                if (part.type === "text") {
                  return m.role === "user" ? (
                    <p key={key} className="whitespace-pre-wrap rounded-2xl bg-zinc-900 px-4 py-2 text-white">
                      {part.text}
                    </p>
                  ) : (
                    <div key={key} className="rounded-2xl bg-white px-4 py-3">
                      <Markdown>{part.text}</Markdown>
                    </div>
                  );
                }
                if (part.type === "tool-propose_basket" && part.state === "output-available") {
                  const out = part.output as BasketOutput;
                  if (!out.ok || !out.basket) return null;
                  const b = out.basket;
                  return (
                    <div key={key} className="my-2 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
                      <p className="mb-2 font-medium">
                        Basket for {b.recipientName}, {b.recipientCity}
                      </p>
                      <ul className="mb-2 space-y-1">
                        {b.lines.map((l) => (
                          <li key={l.productId} className="flex justify-between gap-4">
                            <span>
                              {l.quantity} × {l.name} <span className="text-zinc-500">({l.unit})</span>
                            </span>
                            <span>${l.quantity * l.unitPriceUsd}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="flex justify-between border-t pt-2 font-medium">
                        <span>Total</span>
                        <span>
                          ${b.totalUsd} <span className="font-normal text-zinc-500">/ ${b.budgetUsd} budget</span>
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">From: {b.merchants.join(", ")}</p>
                    </div>
                  );
                }
                if (part.type === "tool-create_checkout" && part.state === "output-available") {
                  const out = part.output as CheckoutOutput;
                  if (!out.ok || !out.orderId) return null;
                  return <Checkout key={key} orderId={out.orderId} basketId={out.basketId!} totalUsd={out.totalUsd!} />;
                }
                if (part.type === "tool-start_monthly_basket" && part.state === "output-available") {
                  const out = part.output as MonthlyOutput;
                  if (!out.ok || !out.approveUrl) return null;
                  return (
                    <div key={key} className="rounded-xl border border-zinc-200 bg-white p-4">
                      <p className="mb-3 text-sm text-zinc-600">
                        ${out.monthlyUsd} every month, billed by PayPal. Cancel anytime from the tracking page.
                      </p>
                      <a
                        href={out.approveUrl}
                        className="block rounded-full bg-[#ffc439] px-4 py-3 text-center font-medium text-zinc-900 hover:brightness-95"
                      >
                        Approve monthly basket with PayPal
                      </a>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))}
          {busy && <p className="text-sm text-zinc-500">Panier Famille is working…</p>}
          {awaitingConfirmation && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => send("Looks good, send it once: create the PayPal checkout.")}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Send it once
              </button>
              <button
                onClick={() => send("Looks good, send this basket every month.")}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Every month
              </button>
              <button
                onClick={() => setInput("Change the basket: ")}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-100"
              >
                Change something
              </button>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="fixed inset-x-0 bottom-0 mx-auto w-full max-w-xl bg-zinc-50 px-4 pb-6 pt-2"
        >
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Who is the basket for, what do they need, what budget?"
              className="min-w-0 flex-1 rounded-full border border-zinc-300 bg-white px-5 py-3 shadow-sm outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </PayPalScriptProvider>
  );
}
