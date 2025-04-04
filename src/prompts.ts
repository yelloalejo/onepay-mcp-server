import { z } from "zod";
import { server } from "./server.js";

/**
 * Aquí registramos los prompts (plantillas) que podemos usar en MCP,
 * por ejemplo, "customer-onboarding", "payment-flow", etc.
 */

// Prompt para "onboarding" de un cliente
server.prompt(
  "customer-onboarding",
  {
    userType: z.enum(["natural", "company"]).describe("Type of user to onboard (natural or company)"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    documentType: z.enum(["CC", "CE", "NIT", "PASSPORT"]).optional().describe("Document type"),
  },
  ({ userType, firstName, lastName, documentType }) => {
    const userTypeTxt = userType === "natural" ? "individual" : "company";

    let nameText = "";
    if (firstName || lastName) {
      nameText = ` for ${firstName ?? ""} ${lastName ?? ""}`.trim();
    }

    let docText = "";
    if (documentType) {
      docText = ` with document type ${documentType}`;
    }

    const finalText = `I want to onboard a new ${userTypeTxt} customer${nameText}${docText} in OnePay. Please guide me on what information is needed and which API endpoints to use.`;

    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: finalText,
          },
        },
      ],
    };
  }
);

// Prompt para flujos de pago (charge, payment, cashout)
server.prompt(
  "payment-flow",
  {
    paymentType: z.enum(["charge", "payment", "cashout"]).describe("Tipo de flujo de pago"),
    amountStr: z.string().optional().describe("Cantidad opcional"),
  },
  ({ paymentType, amountStr }) => {
    let flowDescription = "";
    switch (paymentType) {
      case "charge":
        flowDescription = "a direct charge to a customer's account or card (no manual approval)";
        break;
      case "payment":
        flowDescription = "a payment request that the customer must approve";
        break;
      case "cashout":
        flowDescription = "a cashout from the business to the customer's bank account";
        break;
    }

    const extra = amountStr ? ` for ${amountStr}` : "";

    const text = `I need to handle ${flowDescription}${extra}. Could you walk me through the process, including the endpoints and any required data?`;

    return {
      messages: [
        {
          role: "user",
          content: { type: "text", text },
        },
      ],
    };
  }
);