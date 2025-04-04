import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Importamos el server
import { server } from "./server.js";

// Importamos la definición de tools, prompts, resources
// (Esto hace que se "ejecuten" esos archivos y registren las definiciones)
import "./tools.js";
import "./prompts.js";
import "./resources.js";

async function main() {
  try {
    console.error("Starting OnePay MCP Server...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("OnePay MCP Server running on stdio");
  } catch (error) {
    console.error("Error starting server:", error);
    setTimeout(() => process.exit(1), 1000);
  }
}

main();