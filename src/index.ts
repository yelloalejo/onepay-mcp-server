
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const API_BASE_URL = "https://api.onepay.la/v1";
const API_KEY = process.env.ONEPAY_API_KEY;

if (!API_KEY) {
  console.error("Error: ONEPAY_API_KEY environment variable is required");
  process.exit(1);
}

const server = new McpServer({
  name: "OnepayAPI",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  }
});

async function makeRequest(endpoint: string, method = "GET", data?: any) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  try {
    const requestOptions: RequestInit = { 
      method, 
      headers 
    };
    
    if (data && method !== "GET") {
      requestOptions.body = JSON.stringify(data);
    }
    
    if (method === "GET" && data) {
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      endpoint += `?${params.toString()}`;
    }

    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`API Error: ${errorBody.message || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error with request to ${endpoint}:`, error);
    throw error;
  }
}

function generateIdempotencyKey() {
  return `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

server.tool(
  "create-customer",
  {
    userType: z.enum(["natural", "company"]),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string(),
    documentType: z.enum(["CC", "CE", "NIT", "PASSPORT"]),
    documentNumber: z.string(),
    nationality: z.string().optional(),
    birthdate: z.string().optional()
  },
  async (params) => {
    try {
      const headers = {
        "x-idempotency": generateIdempotencyKey()
      };
      
      const data: Record<string, any> = {
        user_type: params.userType,
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone: params.phone,
        document_type: params.documentType,
        document_number: params.documentNumber
      };
      
      if (params.nationality) {
        data.nationality = params.nationality;
      }
      
      if (params.birthdate) {
        data.birthdate = params.birthdate;
      }
      
      const result = await makeRequest("/customers", "POST", data);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error creating customer: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Get customer details tool
server.tool(
  "get-customer",
  {
    customerId: z.string()
  },
  async ({ customerId }) => {
    try {
      const result = await makeRequest(`/customers/${customerId}`);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error retrieving customer: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// List customers tool
server.tool(
  "list-customers",
  {
    page: z.number().optional(),
    limit: z.number().optional()
  },
  async (params) => {
    try {
      const queryParams: Record<string, any> = {};
      if (params.page) queryParams.page = params.page;
      if (params.limit) queryParams.per_page = params.limit;
      
      const result = await makeRequest("/customers", "GET", queryParams);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error listing customers: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// ================= ACCOUNT MANAGEMENT TOOLS =================

// Create bank account tool
server.tool(
  "create-account",
  {
    subtype: z.enum(["SAVINGS", "CHECKING"]),
    authorization: z.boolean(),
    reEnrollment: z.boolean(),
    accountNumber: z.string(),
    externalId: z.string().optional(),
    bankId: z.string(),
    customerId: z.string()
  },
  async (params) => {
    try {
      const headers = {
        "x-idempotency": generateIdempotencyKey()
      };
      
      const data: Record<string, any> = {
        subtype: params.subtype,
        authorization: params.authorization,
        "re-enrollment": params.reEnrollment,
        account_number: params.accountNumber,
        bank_id: params.bankId,
        customer_id: params.customerId
      };
      
      if (params.externalId) {
        data.external_id = params.externalId;
      }
      
      const result = await makeRequest("/accounts", "POST", data);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error creating account: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Get account details tool
server.tool(
  "get-account",
  {
    accountId: z.string()
  },
  async ({ accountId }) => {
    try {
      const result = await makeRequest(`/accounts/${accountId}`);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error retrieving account: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// List customer accounts tool
server.tool(
  "list-customer-accounts",
  {
    customerId: z.string()
  },
  async ({ customerId }) => {
    try {
      const result = await makeRequest(`/customers/${customerId}/accounts`);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error listing accounts: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// ================= PAYMENT TOOLS =================

// Create payment tool
server.tool(
  "create-payment",
  {
    customerId: z.string(),
    amount: z.number(),
    title: z.string(),
    currency: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    reference: z.string().optional(),
    description: z.string().optional(),
    externalId: z.string().optional(),
    redirectUrl: z.string().optional()
  },
  async (params) => {
    try {
      const headers = {
        "x-idempotency": generateIdempotencyKey()
      };
      
      const data: Record<string, any> = {
        customer_id: params.customerId,
        amount: params.amount,
        title: params.title
      };
      
      // Add optional fields
      if (params.currency) data.currency = params.currency;
      if (params.phone) data.phone = params.phone;
      if (params.email) data.email = params.email;
      if (params.reference) data.reference = params.reference;
      if (params.description) data.description = params.description;
      if (params.externalId) data.external_id = params.externalId;
      if (params.redirectUrl) data.redirect_url = params.redirectUrl;
      
      const result = await makeRequest("/payments", "POST", data);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error creating payment: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Create charge tool
server.tool(
  "create-charge",
  {
    title: z.string(),
    customerId: z.string(),
    amount: z.number(),
    accountId: z.string().optional(),
    cardId: z.string().optional(),
    currency: z.string().optional()
  },
  async (params) => {
    try {
      const headers = {
        "x-idempotency": generateIdempotencyKey()
      };
      
      const data: Record<string, any> = {
        title: params.title,
        customer_id: params.customerId,
        amount: params.amount
      };
      
      // One of account_id or card_id is required
      if (params.accountId) data.account_id = params.accountId;
      if (params.cardId) data.card_id = params.cardId;
      if (params.currency) data.currency = params.currency;
      
      const result = await makeRequest("/charges", "POST", data);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error creating charge: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// List charges tool
server.tool(
  "list-charges",
  {
    page: z.number().optional(),
    status: z.string().optional(),
    createdFrom: z.string().optional(),
    createdTo: z.string().optional()
  },
  async (params) => {
    try {
      const queryParams: Record<string, any> = {};
      if (params.page) queryParams.page = params.page;
      if (params.status) queryParams.status = params.status;
      if (params.createdFrom) queryParams.created_from = params.createdFrom;
      if (params.createdTo) queryParams.created_to = params.createdTo;
      
      const result = await makeRequest("/charges", "GET", queryParams);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error listing charges: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Get charge details tool
server.tool(
  "get-charge",
  {
    chargeId: z.string()
  },
  async ({ chargeId }) => {
    try {
      const result = await makeRequest(`/charges/${chargeId}`);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error retrieving charge: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// ================= CARD TOOLS =================

// Create card tool
server.tool(
  "create-card",
  {
    cardNumber: z.string(),
    expirationYear: z.string(),
    expirationMonth: z.string(),
    ccv: z.string(),
    holderName: z.string(),
    customerId: z.string(),
    authorization: z.boolean()
  },
  async (params) => {
    try {
      const headers = {
        "x-idempotency": generateIdempotencyKey()
      };
      
      const data = {
        card_number: params.cardNumber,
        expiration_year: params.expirationYear,
        expiration_month: params.expirationMonth,
        ccv: params.ccv,
        holder_name: params.holderName,
        customer_id: params.customerId,
        authorization: params.authorization
      };
      
      // Note: Cards API has a different base URL
      const cardsUrl = "https://cards.onepay.la/v1/cards";
      
      // We'll use fetch directly here since makeRequest uses the base API URL
      const response = await fetch(cardsUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-idempotency": headers["x-idempotency"]
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`API Error: ${errorBody.message || response.statusText}`);
      }
      
      const result = await response.json();
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error creating card: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// List customer cards tool
server.tool(
  "list-customer-cards",
  {
    customerId: z.string()
  },
  async ({ customerId }) => {
    try {
      const result = await makeRequest(`/customers/${customerId}/cards`);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error listing cards: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// ================= BALANCE TOOLS =================

// Get balance tool
server.tool(
  "get-balance",
  {},
  async () => {
    try {
      const result = await makeRequest("/balances");
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error retrieving balance: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Cashout (dispersión) tool
server.tool(
  "create-cashout",
  {
    amount: z.number(),
    accountId: z.string(),
    customerId: z.string(),
    description: z.string().optional(),
    externalId: z.string().optional(),
    currency: z.string(),
    method: z.enum(["ACH", "TURBO"])
  },
  async (params) => {
    try {
      const headers = {
        "x-idempotency": generateIdempotencyKey()
      };
      
      const data: Record<string, any> = {
        amount: params.amount,
        account_id: params.accountId,
        customer_id: params.customerId,
        currency: params.currency,
        method: params.method
      };
      
      if (params.description) data.description = params.description;
      if (params.externalId) data.external_id = params.externalId;
      
      const result = await makeRequest("/cashouts", "POST", data);
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Error creating cashout: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// ================= RESOURCES =================

// Add resource for authentication information
server.resource(
  "auth-info",
  "onepay://auth-info",
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        text: `# Onepay Authentication\n
Onepay uses API key authentication. Your requests must include an Authorization header with the format:
\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

For operations that create or modify data, you also need to include an idempotency key:
\`\`\`
x-idempotency: UNIQUE_KEY
\`\`\`
`
      }]
    };
  }
);

// Add resource for API endpoints overview
server.resource(
  "api-endpoints",
  "onepay://endpoints",
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        text: `# Onepay API Endpoints

## Base URL
- Production: https://api.onepay.la/v1
- Cards API: https://cards.onepay.la/v1/cards

## Main Endpoints
- Customers: /customers
- Accounts: /accounts
- Cards: /cards
- Payments: /payments
- Charges: /charges
- Cashouts: /cashouts
- Balances: /balances

Each endpoint supports standard REST operations (GET, POST, DELETE) as appropriate.
`
      }]
    };
  }
);

// Add resource for bank information
server.resource(
  "banks-info",
  "onepay://banks",
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        text: `# Banks for Automated Debits

Supported banks for automated debits include:
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
- Nequi (requires user intervention when connecting)
- Scotiabank Colpatria
- Daviplata (requires user intervention when connecting)

Most banks process on the next business day, while Nequi and Daviplata process in real-time.
`
      }]
    };
  }
);

// ================= PROMPTS =================

// Add customer onboarding prompt
server.prompt(
  "customer-onboarding",
  {
    userType: z.enum(["natural", "company"]).describe("Type of user (individual or company)"),
    firstName: z.string().optional().describe("Customer's first name"),
    lastName: z.string().optional().describe("Customer's last name"),
    documentType: z.enum(["CC", "CE", "NIT", "PASSPORT"]).optional().describe("Document type")
  },
  (params) => {
    const userTypeText = params.userType === "natural" ? "individual" : "company";
    let nameText = "";
    if (params.firstName && params.lastName) {
      nameText = ` for ${params.firstName} ${params.lastName}`;
    }
    let documentText = "";
    if (params.documentType) {
      documentText = ` using document type ${params.documentType}`;
    }
    
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `I want to onboard a new ${userTypeText} customer${nameText}${documentText} to the Onepay platform. Please guide me through the process, including what information I need to collect and which API endpoints to use.`
        }
      }]
    };
  }
);

// Add payment processing prompt
server.prompt(
  "payment-flow",
  {
    paymentType: z.enum(["charge", "payment", "cashout"]).describe("Type of payment flow"),
    amountStr: z.string().optional().describe("Optional amount for the payment")
  },
  (params) => {
    let amountText = "";
    if (params.amountStr) {
      amountText = ` for ${params.amountStr}`;
    }
    
    let paymentTypeText = "";
    switch(params.paymentType) {
      case "charge":
        paymentTypeText = "direct charge to a customer's card or account";
        break;
      case "payment":
        paymentTypeText = "payment request that the customer needs to approve";
        break;
      case "cashout":
        paymentTypeText = "dispersión (cashout) to a customer's account";
        break;
    }
    
    return {
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `I need to process a ${paymentTypeText}${amountText}. Please explain the complete process, including which API endpoints to use, what data I need to provide, and how to handle possible errors or responses.`
        }
      }]
    };
  }
);

// Start the server with STDIO transport
async function main() {
    try {
      console.error("Starting Onepay MCP Server...");
      const transport = new StdioServerTransport();
      console.error("Transport created, connecting to server...");
      await server.connect(transport);
      console.error("Onepay MCP Server running on stdio");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error starting server:", error.message, error.stack);
      } else {
        console.error("Unknown error starting server:", error);
      }
      // Keep process alive for debugging
      // process.exit(1);
    }
}

main();