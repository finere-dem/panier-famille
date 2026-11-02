// Spike: record a delivery (shipment tracking) then refund, on an already captured sandbox order.
// Run: node --env-file=.env.local scripts/spike-delivery-refund.mjs <ORDER_ID> <CAPTURE_ID>
import { PayPalAgentToolkit, ALL_TOOLS_ENABLED } from "@paypal/agent-toolkit/ai-sdk";

const [orderId, captureId] = process.argv.slice(2);
const tools = new PayPalAgentToolkit({
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  configuration: { actions: ALL_TOOLS_ENABLED, context: { sandbox: true } },
}).getTools();

for (const carrier of ["OTHER", "DHL"]) {
  console.log(`tracking (${carrier}):`, await tools.create_shipment_tracking.execute({
    order_id: orderId, transaction_id: captureId, tracking_number: `PF-SPIKE-${carrier}`, status: "DELIVERED", carrier,
  }));
}
console.log("refund:", await tools.create_refund.execute({ capture_id: captureId, note_to_payer: "Spike refund" }));
