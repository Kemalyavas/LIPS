import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://sfc-mcp-brain.sevenfigurecreators.workers.dev/mcp?key=sfc_live_f7ef9a504e48d9d94944097c4753054e";

async function main() {
  const client = new Client({ name: "lips-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  await client.connect(transport);

  // List frameworks
  console.log("=== FRAMEWORKS ===");
  const frameworks = await client.callTool({ name: "list_frameworks", arguments: {} });
  console.log(JSON.stringify(frameworks, null, 2));

  // Get content intelligence
  console.log("\n=== CONTENT INTELLIGENCE ===");
  const intel = await client.callTool({ name: "get_content_intelligence", arguments: { days: 90 } });
  console.log(JSON.stringify(intel, null, 2).substring(0, 2000));

  await client.close();
}

main().catch(console.error);
