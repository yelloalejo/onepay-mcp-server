import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Add error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Create a simple server
const server = new McpServer({
  name: "OnepayDebug",
  version: "1.0.0"
});

// Add a simple echo tool
server.tool(
  "echo",
  {
    message: z.string()
  },
  async ({ message }) => {
    console.error("Echo tool called with:", message);
    return {
      content: [{
        type: "text",
        text: `Echo: ${message}`
      }]
    };
  }
);

// Start the server
async function main() {
  try {
    console.error("Starting debug server...");
    const transport = new StdioServerTransport();
    console.error("Transport created, connecting to server...");
    await server.connect(transport);
    console.error("Debug server running successfully");
  } catch (error) {
    console.error("Error starting server:", error);
  }
}

main();