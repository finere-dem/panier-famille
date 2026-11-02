// Day-1 spike: prove the PayPal Agent Toolkit can create a sandbox order with our credentials,
// before any UI or LLM is involved. Run: node --env-file=.env.local scripts/spike-paypal.mjs
import { PayPalAgentToolkit, ALL_TOOLS_ENABLED } from "@paypal/agent-toolkit/ai-sdk";

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const toolkit = new PayPalAgentToolkit({
  clientId: PAYPAL_CLIENT_ID,
  clientSecret: PAYPAL_CLIENT_SECRET,
  configuration: { actions: ALL_TOOLS_ENABLED, context: { sandbox: true } },
});
const tools = toolkit.getTools();

const order = await tools.create_order.execute({
  currencyCode: "USD",
  items: [
    { name: "Rice 25 kg", quantity: 1, itemCost: 22, itemTotal: 22, taxPercent: 0, description: "Spike test item" },
    { name: "Cooking oil 5 L", quantity: 1, itemCost: 12, itemTotal: 12, taxPercent: 0, description: "Spike test item" },
  ],
  returnUrl: "https://example.com/return",
  cancelUrl: "https://example.com/cancel",
});
console.log(JSON.stringify(order, null, 2));
