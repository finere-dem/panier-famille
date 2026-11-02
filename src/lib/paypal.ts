import { PayPalAgentToolkit, ALL_TOOLS_ENABLED } from "@paypal/agent-toolkit/ai-sdk";
import { tool, type Tool } from "ai";

// The toolkit's AI SDK adapter is built against ai@4, whose tools are
// { description, parameters, execute }. ai@7 expects `inputSchema`, so we rewrap them.
type LegacyTool = {
  description: string;
  parameters: Parameters<typeof tool>[0]["inputSchema"];
  execute: (args: unknown) => Promise<unknown>;
};

const toolkit = new PayPalAgentToolkit({
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
  configuration: { actions: ALL_TOOLS_ENABLED, context: { sandbox: true } },
});

const legacyTools = toolkit.getTools() as unknown as Record<string, LegacyTool>;

/** PayPal toolkit tools, wrapped for ai@7, restricted to the given names. */
export function paypalTools(names: string[]): Record<string, Tool> {
  return Object.fromEntries(
    names.map((name) => {
      const t = legacyTools[name];
      if (!t) throw new Error(`Unknown PayPal toolkit tool: ${name}`);
      return [name, tool({ description: t.description, inputSchema: t.parameters, execute: t.execute })];
    }),
  );
}

/**
 * Call a toolkit tool directly from server code. Toolkit results come back as JSON strings,
 * and some tools (pay_order) wrap the PayPal payload in { status: "success", response }.
 */
export async function callPaypal<T = Record<string, unknown>>(name: string, args: Record<string, unknown>): Promise<T> {
  const raw = await legacyTools[name].execute(args);
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    throw new Error(`PayPal ${name} failed: ${JSON.stringify((parsed as { error: unknown }).error)}`);
  }
  if (parsed?.status === "success" && parsed.response) return parsed.response as T;
  return parsed as T;
}
