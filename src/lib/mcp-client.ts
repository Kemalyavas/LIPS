import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = process.env.SFC_MCP_URL || "";

let client: Client | null = null;
let connected = false;

async function getClient(): Promise<Client> {
  if (client && connected) return client;

  if (!MCP_URL) throw new Error("SFC_MCP_URL is not set");

  client = new Client({ name: "lips-post-engine", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);
  connected = true;
  return client;
}

function extractText(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n");
}

export async function getFramework(frameworkPath: string): Promise<string> {
  const c = await getClient();
  const result = await c.callTool({
    name: "get_framework",
    arguments: { framework_path: frameworkPath },
  });
  return extractText(result as { content: Array<{ type: string; text?: string }> });
}

export async function searchContentLibrary(postType?: string, limit: number = 5): Promise<string> {
  const c = await getClient();
  const args: Record<string, unknown> = { limit, min_leads: 0 };
  if (postType) args.post_type = postType;
  const result = await c.callTool({
    name: "search_content_library",
    arguments: args,
  });
  return extractText(result as { content: Array<{ type: string; text?: string }> });
}

export async function getContentIntelligence(): Promise<string> {
  const c = await getClient();
  const result = await c.callTool({
    name: "get_content_intelligence",
    arguments: { days: 90 },
  });
  return extractText(result as { content: Array<{ type: string; text?: string }> });
}

// Map post type to best framework
const FRAMEWORK_MAP: Record<string, string> = {
  value: "frameworks/inbound_lead_content_engine.md",
  story: "frameworks/hook_movie_trailer_engine.md",
  lead_magnet: "frameworks/inbound_lead_content_engine.md",
  case_study: "frameworks/inbound_lead_content_engine.md",
  direct_cta: "frameworks/cold_dm_precision_engine.md",
  viral: "frameworks/decoding_viral_linkedin_content.md",
};

export function getFrameworkForType(postType: string): string {
  return FRAMEWORK_MAP[postType] || FRAMEWORK_MAP.value;
}
