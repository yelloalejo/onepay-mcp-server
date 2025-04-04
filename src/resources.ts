import { server } from "./server.js";

/**
 * Aquí definimos los 'resources' (recursos) que expondremos a través de MCP.
 * Son URIs tipo "onepay://algo" que devuelven contenido (textos, docs, etc.).
 */

// Recurso de info de autenticación (onepay://auth-info)
server.resource(
  "auth-info",
  "onepay://auth-info",
  async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: `# OnePay Authentication
To authenticate with OnePay, include the following header in your requests:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

For any POST/PUT/DELETE request that modifies data, add an Idempotency Key:
\`\`\`
x-idempotency: UNIQUE_KEY
\`\`\`

This helps avoid duplicate operations if the request is retried.
`,
        },
      ],
    };
  }
);

// Recurso con descripción de los endpoints de la API (onepay://endpoints)
server.resource(
  "api-endpoints",
  "onepay://endpoints",
  async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: `# OnePay API Endpoints

**Base URL**: https://api.onepay.la/v1
**Cards Base**: https://cards.onepay.la/v1/cards

**Main Endpoints**:
- /customers
- /accounts
- /cards
- /payments
- /charges
- /cashouts
- /balances

Use the appropriate HTTP method for each operation. 
Make sure to include \`Authorization\` and \`x-idempotency\` headers as needed.
`,
        },
      ],
    };
  }
);

// Recurso con lista de bancos disponibles (onepay://banks)
server.resource(
  "banks-info",
  "onepay://banks",
  async (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: `# Banks for Automatic Debits

Supported Banks (Colombia) for debit operations include (processing next business day unless otherwise noted):
- AV Villas
- Banco Agrario
- Banco Caja Social
- Banco Compartir
- Banco Cooperativo Coopcentral
- Banco de Bogotá
- Banco de Occidente
- Banco Falabella
- Banco Popular
- Banco Serfinanza
- Bancolombia
- Bancoomeva
- BBVA
- Citibank
- Davivienda
- GNB Sudameris
- Itaú
- **Nequi (real-time; user must confirm in the Nequi app)**
- Scotiabank Colpatria
- **Daviplata (real-time; user must confirm in the Daviplata app)**

Make sure the account details (account number, doc type, etc.) match the bank's records.
`,
        },
      ],
    };
  }
);