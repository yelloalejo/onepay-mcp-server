import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const server = new McpServer({
  name: "OnepayAPI",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});