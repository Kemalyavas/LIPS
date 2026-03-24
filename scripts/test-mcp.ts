// Test script to discover SFC MCP server tools
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = "https://sfc-mcp-brain.sevenfigurecreators.workers.dev/mcp?key=sfc_live_f7ef9a504e48d9d94944097c4753054e";

async function main() {
  console.log("Connecting to SFC MCP server...");

  const client = new Client({ name: "lips-test", version: "1.0.0" });

  try {
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
    await client.connect(transport);
    console.log("Connected!\n");

    // List tools
    console.log("=== TOOLS ===");
    const tools = await client.listTools();
    for (const tool of tools.tools) {
      console.log(`\nTool: ${tool.name}`);
      console.log(`Description: ${tool.description}`);
      console.log(`Input schema:`, JSON.stringify(tool.inputSchema, null, 2));
    }

    // List resources (if any)
    try {
      console.log("\n=== RESOURCES ===");
      const resources = await client.listResources();
      for (const r of resources.resources) {
        console.log(`Resource: ${r.name} - ${r.uri}`);
      }
    } catch (e) {
      console.log("No resources or not supported");
    }

    // List prompts (if any)
    try {
      console.log("\n=== PROMPTS ===");
      const prompts = await client.listPrompts();
      for (const p of prompts.prompts) {
        console.log(`Prompt: ${p.name} - ${p.description}`);
        console.log(`Arguments:`, p.arguments);
      }
    } catch (e) {
      console.log("No prompts or not supported");
    }

    await client.close();
  } catch (error) {
    console.error("Connection failed:", error);

    // Fallback: try as SSE transport
    console.log("\nTrying SSE transport...");
    try {
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
      const client2 = new Client({ name: "lips-test", version: "1.0.0" });
      const transport2 = new SSEClientTransport(new URL(MCP_URL));
      await client2.connect(transport2);
      console.log("Connected via SSE!");

      const tools = await client2.listTools();
      for (const tool of tools.tools) {
        console.log(`\nTool: ${tool.name}`);
        console.log(`Description: ${tool.description}`);
        console.log(`Input schema:`, JSON.stringify(tool.inputSchema, null, 2));
      }

      await client2.close();
    } catch (e2) {
      console.error("SSE also failed:", e2);
    }
  }
}

main();
