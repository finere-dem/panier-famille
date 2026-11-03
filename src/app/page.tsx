"use client";

import { useChat } from "@ai-sdk/react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useState } from "react";
import { BasketCard } from "@/components/BasketCard";
import { Checkout } from "@/components/Checkout";
import { Markdown } from "@/components/Markdown";
import { Logo, Nav } from "@/components/Nav";

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

const EXAMPLES = [
  "Send my mother Fatoumata in Bamako what she needs for the month: rice, oil, sugar and her blood pressure medicine. Budget $80.",
  "My sister Aminata just had a baby in Bamako. Diapers, milk and soap, around $50.",
  "Cooking gas and electricity credit for my father Seydou, $30.",
];

const STEPS = [
  { title: "Tell the agent", text: "Who it's for, what they need, your budget." },
  { title: "Approve with PayPal", text: "The agent never pays on its own. You confirm." },
  { title: "Delivered, with proof", text: "A local merchant delivers and sends a photo." },
];

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
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-36">
        <Nav />

        {messages.length === 0 && (
          <section className="mb-8">
            <h1 className="font-display text-4xl font-semibold leading-tight">
              Send a basket, <span className="text-clay">not cash.</span>
            </h1>
            <p className="mt-3 text-muted">
              Tell our agent what your family back home needs. Local merchants deliver real goods, you get a photo when it
              arrives, and PayPal protects every dollar.
            </p>

            <ol className="mt-6 grid gap-3 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-2xl border border-sand bg-paper p-4">
                  <span className="font-display text-2xl font-semibold text-ochre">{i + 1}</span>
                  <p className="mt-1 font-medium">{s.title}</p>
                  <p className="text-sm text-muted">{s.text}</p>
                </li>
              ))}
            </ol>

            <p className="mb-2 mt-8 text-sm font-medium text-muted">Try one of these</p>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  className="rounded-2xl border border-dashed border-clay/40 bg-paper px-4 py-3 text-left text-sm hover:border-clay hover:bg-white"
                >
                  “{ex}”
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "max-w-[85%] self-end" : "flex w-full gap-3 self-start"}>
              {m.role === "assistant" && <Logo className="mt-1 h-7 w-7 shrink-0" />}
              <div className={m.role === "assistant" ? "flex min-w-0 flex-1 flex-col gap-3" : ""}>
                {m.parts.map((part, i) => {
                  const key = `${m.id}-${i}`;
                  if (part.type === "text") {
                    return m.role === "user" ? (
                      <p key={key} className="whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink px-4 py-3 text-cream">
                        {part.text}
                      </p>
                    ) : (
                      <div key={key} className="rounded-2xl rounded-tl-sm bg-paper px-4 py-3 shadow-sm">
                        <Markdown>{part.text}</Markdown>
                      </div>
                    );
                  }
                  if (part.type === "tool-propose_basket" && part.state === "output-available") {
                    const out = part.output as BasketOutput;
                    if (!out.ok || !out.basket) return null;
                    const b = out.basket;
                    return (
                      <BasketCard
                        key={key}
                        title={`Basket for ${b.recipientName}, ${b.recipientCity}`}
                        lines={b.lines}
                        totalUsd={b.totalUsd}
                        budgetUsd={b.budgetUsd}
                        merchants={b.merchants}
                      />
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
                      <div key={key} className="rounded-2xl border border-sand bg-paper p-5 shadow-sm">
                        <p className="font-display text-lg font-semibold">Monthly basket · ${out.monthlyUsd}/month</p>
                        <p className="mb-4 mt-1 text-sm text-muted">Billed by PayPal each month. Stop it anytime from the tracking page.</p>
                        <a
                          href={out.approveUrl}
                          className="block rounded-full bg-[#ffc439] px-4 py-3 text-center font-semibold text-[#142c8e] hover:brightness-95"
                        >
                          Approve with PayPal
                        </a>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-3 text-sm text-muted">
              <Logo className="h-7 w-7 animate-pulse" />
              Finding the best basket…
            </div>
          )}

          {awaitingConfirmation && (
            <div className="flex flex-wrap gap-2 pl-10">
              <button
                onClick={() => send("Looks good, send it once: create the PayPal checkout.")}
                className="rounded-full bg-clay px-4 py-2 text-sm font-medium text-cream hover:bg-clay-dark"
              >
                Send it once
              </button>
              <button
                onClick={() => send("Looks good, send this basket every month.")}
                className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream hover:opacity-90"
              >
                Every month
              </button>
              <button
                onClick={() => setInput("Change the basket: ")}
                className="rounded-full border border-sand bg-paper px-4 py-2 text-sm hover:border-clay"
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
          className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-cream via-cream to-cream/0 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          {/* One pill composer: the send button sits inside the field instead of floating next to it. */}
          <div className="mx-auto w-full max-w-xl px-4">
            <div className="flex items-center gap-2 rounded-full border border-sand bg-paper py-1.5 pl-5 pr-1.5 shadow-sm focus-within:border-clay">
              <input
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder="Who is it for, and what budget?"
                className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted/70"
              />
              <button
                type="submit"
                aria-label="Send"
                disabled={busy || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-clay text-cream transition-colors hover:bg-clay-dark disabled:bg-sand disabled:text-muted"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      </main>
    </PayPalScriptProvider>
  );
}
