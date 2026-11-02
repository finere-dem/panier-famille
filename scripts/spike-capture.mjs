// Day-1 spike, part 2: capture a sandbox order once the buyer approved it.
// Run: node --env-file=.env.local scripts/spike-capture.mjs <ORDER_ID>
import { PayPalAgentToolkit, ALL_TOOLS_ENABLED } from "@paypal/agent-toolkit/ai-sdk";

const orderId = process.argv[2];
if (!orderId) {
  console.error("Usage: node --env-file=.env.local scripts/spike-capture.mjs <ORDER_ID>");
  process.exit(1);
}

const tools = new PayPalAgentToolkit({
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  configuration: { actions: ALL_TOOLS_ENABLED, context: { sandbox: true } },
}).getTools();

console.log(await tools.pay_order.execute({ id: orderId }));
