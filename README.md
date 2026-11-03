# Panier Famille

**Send a basket, not cash.**

Live demo: https://panier-famille.vercel.app

Panier Famille lets people of the diaspora support their family back home with real goods instead of a cash transfer. You tell an AI agent who the basket is for, what they need and your budget. The agent shops among local merchants in Bamako, builds a basket that fits the budget, and prepares a PayPal checkout. You approve the payment yourself, a local partner prepares and delivers the basket, and you receive a photo when it arrives. If something goes wrong, you get a full refund through PayPal. You can also make it a monthly basket with a PayPal subscription.

## Why

Cash transfers to West Africa are expensive, and the sender has no visibility on how the money is used. Many families abroad already send goods through friends, which is slow and unreliable. Panier Famille gives the sender three things a transfer cannot:

- **Control:** the money buys exactly what the family needs (food, hygiene, baby care, health, energy).
- **Proof:** every delivery is confirmed with a photo and recorded on the PayPal transaction.
- **Protection:** the payment goes through PayPal, with refunds when a basket is not delivered as promised.

## How it works

1. **Tell the agent.** "Send my mother Fatoumata in Bamako what she needs for the month: rice, oil, sugar and her blood pressure medicine. Budget $80."
2. **The agent builds the basket.** It searches the merchant catalog, proposes a basket that fits the budget, explains its choices, and asks whether to send it once or every month.
3. **You approve with PayPal.** The agent creates the order, but it never pays on its own. You confirm in the PayPal checkout.
4. **The partner delivers.** The Bamako partner dashboard shows every paid basket. The partner starts preparing, then confirms delivery with a photo.
5. **You track and stay protected.** The tracking page shows progress, the delivery photo and a timeline. A refund button is always available.

## PayPal integration

| Step | PayPal API | How it is used |
|------|-----------|----------------|
| Checkout | Orders v2 (`create_order`, `get_order`) via the PayPal Agent Toolkit | The agent creates an itemized USD order from the basket it proposed |
| Approval | PayPal JS SDK (`@paypal/react-paypal-js`) | The sender approves in the PayPal popup |
| Capture | Orders v2 (`pay_order`) | Captured server-side after approval |
| Delivery proof | Shipment Tracking (`create_shipment_tracking`) | Delivery is recorded on the transaction with a tracking number |
| Refund | Payments v2 (`create_refund`) | Full refund on the capture when the sender reports a problem |
| Monthly basket | Catalog Products and Subscriptions v1 (`create_product`, `create_subscription_plan`, `create_subscription`, `show_subscription_details`, `cancel_subscription`) | A monthly plan priced at the basket total, approved by the sender, cancellable anytime |

The agent only gets the tools it needs. Capture, delivery and refunds happen in server routes triggered by a human action, never by the model.

## Built with

- **Next.js 16** (App Router) on **Vercel**
- **AI SDK** with **Claude** (Anthropic) as the shopping agent
- **PayPal Agent Toolkit** for the PayPal tools
- **Neon Postgres** for baskets (falls back to in-memory storage when no database is configured)
- **AG Grid** for the partner dashboard
- **Tailwind CSS**, with a palette inspired by bogolan cloth from Mali

## Try it

Open https://panier-famille.vercel.app and pick one of the example requests, or write your own. Everything runs in the **PayPal sandbox**: no real money moves. To approve the payment, log in with the sandbox buyer account given in the Devpost testing instructions (or any PayPal sandbox personal account of your own).

Then open the **Partner** page to play the Bamako partner: start preparing the basket and confirm delivery with any photo. Go back to the tracking page to see the photo, the timeline, and to try a refund.

## Run it locally

Requirements: Node.js 20+, a PayPal sandbox app (client ID and secret from https://developer.paypal.com/dashboard/applications/sandbox) and an Anthropic API key.

```bash
git clone https://github.com/finere-dem/panier-famille.git
cd panier-famille
npm install
```

Create `.env.local`:

```bash
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id
ANTHROPIC_API_KEY=your_anthropic_key
# Optional: persist baskets in Postgres. Without it, baskets live in memory.
# DATABASE_URL=postgres://...
```

```bash
npm run dev
```

Open http://localhost:3000.

## Project structure

```
src/
  app/
    page.tsx                  Chat with the agent, basket card, PayPal checkout
    api/chat/route.ts         Agent: system prompt and tools
    api/orders/[id]/capture   Capture after approval
    api/baskets/...           Status, delivery proof, refund, subscription
    baskets/[id]/             Sender tracking page
    partner/                  Bamako partner dashboard (AG Grid)
  lib/
    catalog.ts                Merchants and products (fictional demo data)
    paypal.ts                 PayPal Agent Toolkit wrapper
    subscriptions.ts          Monthly basket on PayPal Subscriptions
    store.ts                  Basket storage (Neon or in-memory)
```

## About the payment model

PayPal is used on the sender side, where the diaspora already has accounts (France, US, Canada). The platform collects the payment and pays local merchants through mobile money, the way most businesses in Mali are paid today. In this demo the merchant payout is simulated, and the merchants and products are fictional.

## Roadmap

- PayPal webhooks for monthly renewals, so each new billing cycle creates a basket automatically
- Mobile money payouts to merchants (Orange Money, Moov Money)
- More cities and merchant onboarding for partners

## License

MIT, see [LICENSE](LICENSE).
