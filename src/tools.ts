import { z } from "zod";
import { server } from "./server.js";
import { makeRequest, makeCardsRequest, generateIdempotencyKey } from "./utils.js";

/**
 *  ======================
 *  1) create-customer
 *  ======================
 */
const createCustomerSchema = z.object({
  userType: z.enum(["natural", "company"]),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  documentType: z.enum(["CC", "CE", "NIT", "PASSPORT"]),
  documentNumber: z.string().min(1),
  nationality: z.string().optional(),
  birthdate: z.string().optional(),
});

server.tool(
  "create-customer",
  {
    userType: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    documentType: z.string().optional(),
    documentNumber: z.string().optional(),
    nationality: z.string().optional(),
    birthdate: z.string().optional(),
  },
  async (params) => {
    // Validación zod
    const parseResult = createCustomerSchema.safeParse(params);
    if (!parseResult.success) {
      // Faltan obligatorios o algo es inválido
      const issues = parseResult.error.issues.map(
        (i) => `- **${i.path.join(".")}**: ${i.message}`
      );
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Faltan datos requeridos:\n${issues.join("\n")}`,
          },
        ],
      };
    }
    // Extraemos campos
    let { userType, firstName, lastName, email, phone, documentType, documentNumber, nationality, birthdate } =
      parseResult.data;

    // 1) nationality
    if (nationality === undefined) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `No definiste 'nationality' (opcional). 
¿Deseas proporcionarlo o continuar sin él? 
(Responde algo como "Usa nationality = 'CO'" o "No, omite nationality")`,
          },
        ],
      };
    }

    // 2) birthdate
    if (birthdate === undefined) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `No definiste 'birthdate' (opcional). 
¿Deseas proporcionarlo o continuar sin él? 
(Responde algo como "birthdate = 1985-01-01" o "No, omite birthdate")`,
          },
        ],
      };
    }
    // Llamada real a OnePay
    try {
      const token = generateIdempotencyKey();
      const body = {
        user_type: userType,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        document_type: documentType,
        document_number: documentNumber,
        nationality: nationality || null,
        birthdate: birthdate || null,
      };
      const result = await makeRequest("/customers", "POST", body, token);
      return {
        isError: false,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error creating customer: ${msg}`,
          },
        ],
      };
    }
  }
);

/**
 *  ======================
 *  2) get-customer
 *  ======================
 */
const getCustomerSchema = z.object({
    customerId: z.string().min(1),
  });
  server.tool(
    "get-customer",
    { customerId: z.string().optional() },
    async (params) => {
      const parseResult = getCustomerSchema.safeParse(params);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map(
          (i) => `- **${i.path.join(".")}**: ${i.message}`
        );
        return {
          isError: true,
          content: [
            { type: "text", text: `Faltan datos:\n${issues.join("\n")}` },
          ],
        };
      }
      const { customerId } = parseResult.data;
      try {
        const res = await makeRequest(`/customers/${customerId}`);
        return {
          isError: false,
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Error: ${msg}` }] };
      }
    }
  );

/**
 *  ======================
 *  3) list-customers
 *  ======================
 *  page y limit son opcionales. 
 */
server.tool(
    "list-customers",
    {
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      // Si deseas forzar check de page:
      if (params.page === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'page' (opcional). ¿Deseas usarlo o continuar sin él?",
            },
          ],
        };
      }
      // Igualmente limit:
      if (params.limit === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'limit' (opcional). ¿Deseas especificarlo o no?",
            },
          ],
        };
      }
  
      try {
        const queryParams: Record<string, any> = {};
        if (params.page) queryParams.page = params.page;
        if (params.limit) queryParams.per_page = params.limit;
        const result = await makeRequest("/customers", "GET", queryParams);
        return {
          isError: false,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Error: ${msg}` }] };
      }
    }
  );

/**
 *  ======================
 *  4) create-account
 *  ======================
 */
const createAccountSchema = z.object({
    subtype: z.enum(["SAVINGS", "CHECKING"]),
    authorization: z.boolean(),
    reEnrollment: z.boolean(),
    accountNumber: z.string().min(1),
    externalId: z.string().optional(),
    bankId: z.string().min(1),
    customerId: z.string().min(1),
  });
  server.tool(
    "create-account",
    {
      subtype: z.string().optional(),
      authorization: z.boolean().optional(),
      reEnrollment: z.boolean().optional(),
      accountNumber: z.string().optional(),
      externalId: z.string().optional(),
      bankId: z.string().optional(),
      customerId: z.string().optional(),
    },
    async (params) => {
      const parseResult = createAccountSchema.safeParse(params);
      if (!parseResult.success) {
        const issues = parseResult.error.issues.map(
          (i) => `- **${i.path.join(".")}**: ${i.message}`
        );
        return {
          isError: true,
          content: [
            { type: "text", text: `Faltan datos:\n${issues.join("\n")}` },
          ],
        };
      }
      let { subtype, authorization, reEnrollment, accountNumber, externalId, bankId, customerId } =
        parseResult.data;
  
      // externalId
      if (externalId === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `No definiste 'externalId' (opcional). 
  ¿Deseas proporcionarlo o continuar sin él?`,
            },
          ],
        };
      }
  
      try {
        const token = generateIdempotencyKey();
        const body = {
          subtype,
          authorization,
          "re-enrollment": reEnrollment,
          account_number: accountNumber,
          external_id: externalId || null,
          bank_id: bankId,
          customer_id: customerId,
        };
        const resp = await makeRequest("/accounts", "POST", body, token);
        return {
          isError: false,
          content: [{ type: "text", text: JSON.stringify(resp, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { isError: true, content: [{ type: "text", text: `Error: ${msg}` }] };
      }
    }
);

// ======================
// 5) get-account
// ======================
const getAccountSchema = z.object({
  accountId: z.string().min(1),
});

server.tool(
  "get-account",
  {
    accountId: z.string().optional(),
  },
  async (params) => {
    const parseResult = getAccountSchema.safeParse(params);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `- **${i.path.join(".")}**: ${i.message}`
      );
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Faltan datos:\n${issues.join("\n")}`,
          },
        ],
      };
    }
    const { accountId } = parseResult.data;
    try {
      const result = await makeRequest(`/accounts/${accountId}`, "GET");
      return {
        isError: false,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error retrieving account: ${msg}`,
          },
        ],
      };
    }
  }
);

// ======================
// 6) list-customer-accounts
// ======================
server.tool(
  "list-customer-accounts",
  {
    customerId: z.string(),
  },
  async ({ customerId }) => {
    try {
      const result = await makeRequest(`/customers/${customerId}/accounts`);
      return {
        isError: false,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error listing accounts: ${msg}`,
          },
        ],
      };
    }
  }
);

/**
 *  ======================
 *  7) create-payment
 *  ======================
 */
const createPaymentSchema = z.object({
    amount: z.number().positive(),
    title: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    customerId: z.string().optional(),
    currency: z.string().optional(),
    reference: z.string().optional(),
    description: z.string().optional(),
    externalId: z.string().optional(),
    redirectUrl: z.string().optional(),
  });
  
  server.tool(
    "create-payment",
    {
      amount: z.number().optional(),
      title: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      currency: z.string().optional(),
      reference: z.string().optional(),
      description: z.string().optional(),
      externalId: z.string().optional(),
      redirectUrl: z.string().optional(),
    },
    async (params) => {
        const pr = createPaymentSchema.safeParse(params);
        if (!pr.success) {
            const issues = pr.error.issues.map(
              i => `- **${i.path.join(".")}**: ${i.message}`
            );
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Faltan datos:\n${issues.join("\n")}`
                }
              ]
            };
          }
        let {
            amount,
            title,
            phone,
            email,
            currency,
            reference,
            description,
            externalId,
            redirectUrl,
          } = pr.data;
  
      // title
      if (!title) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "No definiste title (opcional). ¿Deseas especificarlo o continuar sin él?"
          }
        ]
      };
    }if (!title) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "No definiste title (opcional). ¿Deseas especificarlo o continuar sin él?"
          }
        ]
      };
    }
  
      // phone o email: uno de los dos si no está, ya habíamos checado en code?
      if (!phone && !email) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Necesito 'phone' o 'email' para notificar al cliente. ¿Deseas proporcionarlo?",
            },
          ],
        };
      }
  
      if (currency === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `No definiste 'currency' (opcional). Por defecto "COP". 
  ¿Deseas usar otra moneda o continuar con "COP"?`,
            },
          ],
        };
      }
  
      if (reference === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'reference' (opcional). ¿Deseas establecerla o continuar sin ella?",
            },
          ],
        };
      }
  
      if (description === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'description' (opcional). ¿Deseas establecerla o continuar?",
            },
          ],
        };
      }
  
      if (externalId === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'externalId' (opcional). ¿Deseas establecerlo o continuar sin él?",
            },
          ],
        };
      }
  
      if (redirectUrl === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'redirectUrl' (opcional). ¿Deseas establecerlo o ignorarlo?",
            },
          ],
        };
      }
  
      // Llamada real
      try {
        const token = generateIdempotencyKey();
        const data: Record<string, any> = {
          amount,
          title,
          phone: phone || null,
          email: email || null,
          currency: currency || "COP",
          reference: reference || null,
          description: description || null,
          external_id: externalId || null,
          redirect_url: redirectUrl || null,
        };
        const result = await makeRequest("/payments", "POST", data, token);
        return {
          isError: false,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error creating payment: ${msg}`
          }
        ]
      };
    }
});


/**
 *  ======================
 *  8) create-charge
 *  ======================
 */
const createChargeSchema = z.object({
    title: z.string().optional(),
    amount: z.number().positive(),
    phone: z.string().optional(),
    customerId: z.string().min(1),
    accountId: z.string().optional(),
    cardId: z.string().optional(),
    currency: z.string().optional(),
  });
  
  server.tool(
    "create-charge",
    {
      title: z.string().optional(),
      amount: z.number().optional(),
      phone: z.string().optional(),
      customerId: z.string().optional(),
      accountId: z.string().optional(),
      cardId: z.string().optional(),
      currency: z.string().optional(),
    },
    async (params) => {
      const pr = createChargeSchema.safeParse(params);
      if (!pr.success) {
        const issues = pr.error.issues.map((i) => `- **${i.path.join(".")}**: ${i.message}`);
        return {
          isError: true,
          content: [{ type: "text", text: `Faltan datos:\n${issues.join("\n")}` }],
        };
      }
      let { title, amount, phone, customerId, accountId, cardId, currency } = pr.data;
  
      // title
      if (title === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'title' (opcional). ¿Deseas establecerlo o continuar sin él?",
            },
          ],
        };
      }
  
      // phone (opcional) -> si quisieras forzar la pregunta, hazlo:
      if (phone === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'phone' (opcional). ¿Deseas proporcionarlo o continuar sin él?",
            },
          ],
        };
      }
  
      // Se requiere accountId o cardId
      if (!accountId && !cardId) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Debes especificar 'accountId' o 'cardId' para el cargo. ¿Cuál usarás?",
            },
          ],
        };
      }
  
      if (currency === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'currency' (opcional). ¿Deseas establecerlo o usar 'COP'?",
            },
          ],
        };
      }
  
      // Llamada real
      try {
        const token = generateIdempotencyKey();
        const body: Record<string, any> = {
          title: title || null,
          amount,
          customer_id: customerId,
          currency: currency || "COP",
        };
        if (accountId) body.account_id = accountId;
        if (cardId) body.card_id = cardId;
  
        // phone no es algo nativo de /charges en doc, 
        // si lo fueras a mandar, -> body.phone = phone
        const result = await makeRequest("/charges", "POST", body, token);
        return {
          isError: false,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error creating payment: ${msg}`
          }
        ]
      };
    }
    }
  );

/**
 *  ======================
 *  9) list-charges
 *  ======================
 *  page, status, createdFrom, createdTo => todos opcionales
 */
server.tool(
    "list-charges",
    {
      page: z.number().optional(),
      status: z.string().optional(),
      createdFrom: z.string().optional(),
      createdTo: z.string().optional(),
    },
    async (params) => {
      // Por cada uno:
      if (params.page === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'page' (opcional). ¿Deseas darlo o ignorarlo?",
            },
          ],
        };
      }
      if (params.status === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'status' (opcional). ¿Deseas usarlo o ignorarlo?",
            },
          ],
        };
      }
      if (params.createdFrom === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'createdFrom' (opcional). ¿Deseas usarlo o ignorarlo?",
            },
          ],
        };
      }
      if (params.createdTo === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'createdTo' (opcional). ¿Deseas usarlo o ignorarlo?",
            },
          ],
        };
      }
  
      try {
        const queryParams: Record<string, any> = {};
        if (params.page) queryParams.page = params.page;
        if (params.status) queryParams.status = params.status;
        if (params.createdFrom) queryParams.created_from = params.createdFrom;
        if (params.createdTo) queryParams.created_to = params.createdTo;
  
        const res = await makeRequest("/charges", "GET", queryParams);
        return {
          isError: false,
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error creating payment: ${msg}`
          }
        ]
      };
    }
    }
  );

// ======================
// 10) get-charge
// ======================
const getChargeSchema = z.object({ chargeId: z.string().min(1) });
server.tool(
  "get-charge",
  {
    chargeId: z.string().optional(),
  },
  async (params) => {
    const parseResult = getChargeSchema.safeParse(params);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `- **${i.path.join(".")}**: ${i.message}`
      );
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Faltan datos:\n${issues.join("\n")}`,
          },
        ],
      };
    }
    const { chargeId } = parseResult.data;
    try {
      const result = await makeRequest(`/charges/${chargeId}`);
      return {
        isError: false,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error retrieving charge: ${msg}`,
          },
        ],
      };
    }
  }
);

// ======================
// 11) create-card
// ======================
const createCardSchema = z.object({
  cardNumber: z.string().min(1),
  expirationYear: z.string().min(1),
  expirationMonth: z.string().min(1),
  ccv: z.string().min(1),
  holderName: z.string().min(1),
  customerId: z.string().min(1),
  authorization: z.boolean(),
});

server.tool(
  "create-card",
  {
    cardNumber: z.string().optional(),
    expirationYear: z.string().optional(),
    expirationMonth: z.string().optional(),
    ccv: z.string().optional(),
    holderName: z.string().optional(),
    customerId: z.string().optional(),
    authorization: z.boolean().optional(),
  },
  async (params) => {
    const parseResult = createCardSchema.safeParse(params);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `- **${i.path.join(".")}**: ${i.message}`
      );
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Faltan datos:\n${issues.join("\n")}`,
          },
        ],
      };
    }
    try {
      const {
        cardNumber,
        expirationYear,
        expirationMonth,
        ccv,
        holderName,
        customerId,
        authorization,
      } = parseResult.data;
      const token = generateIdempotencyKey();

      const body = {
        card_number: cardNumber,
        expiration_year: expirationYear,
        expiration_month: expirationMonth,
        ccv,
        holder_name: holderName,
        customer_id: customerId,
        authorization,
      };

      // Petición a la API de tarjetas
      const resp = await makeCardsRequest("POST", body, token);
      return {
        isError: false,
        content: [
          {
            type: "text",
            text: JSON.stringify(resp, null, 2),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error creating card: ${msg}`,
          },
        ],
      };
    }
  }
);

// ======================
// 12) list-customer-cards
// ======================
const listCustomerCardsSchema = z.object({
  customerId: z.string().min(1),
});

server.tool(
  "list-customer-cards",
  {
    customerId: z.string().optional(),
  },
  async (params) => {
    const parseResult = listCustomerCardsSchema.safeParse(params);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `- **${i.path.join(".")}**: ${i.message}`
      );
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Faltan datos:\n${issues.join("\n")}`,
          },
        ],
      };
    }
    const { customerId } = parseResult.data;
    try {
      const result = await makeRequest(`/customers/${customerId}/cards`);
      return {
        isError: false,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error listing cards: ${msg}`,
          },
        ],
      };
    }
  }
);

// ======================
// 13) get-balance
// ======================
server.tool("get-balance", {}, async () => {
  try {
    const result = await makeRequest("/balances");
    return {
      isError: false,
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error retrieving balance: ${msg}`,
        },
      ],
    };
  }
});

/**
 *  ======================
 *  14) create-cashout
 *  ======================
 */
const createCashoutSchema = z.object({
    amount: z.number().positive(),
    accountId: z.string().min(1),
    customerId: z.string().min(1),
    currency: z.string().min(1),
    method: z.enum(["ACH", "TURBO"]),
    description: z.string().optional(),
    externalId: z.string().optional(),
  });
  server.tool(
    "create-cashout",
    {
      amount: z.number().optional(),
      accountId: z.string().optional(),
      customerId: z.string().optional(),
      currency: z.string().optional(),
      method: z.string().optional(),
      description: z.string().optional(),
      externalId: z.string().optional(),
    },
  async (params) => {
    const parseResult = createCashoutSchema.safeParse(params);
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(
        (i) => `- **${i.path.join(".")}**: ${i.message}`
      );
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Faltan datos:\n${issues.join("\n")}`,
          },
        ],
      };
    }
    let { amount, accountId, customerId, currency, method, description, externalId } = parseResult.data;

    if (description === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'description' (opcional). ¿Deseas establecerlo o ignorarlo?",
            },
          ],
        };
      }
  
      if (externalId === undefined) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No definiste 'externalId' (opcional). ¿Deseas establecerlo o ignorarlo?",
            },
          ],
        };
      }
      
    try {
      const token = generateIdempotencyKey();
      const body: Record<string, any> = {
        amount,
        account_id: accountId,
        customer_id: customerId,
        currency,
        method,
        description: description || null,
        external_id: externalId || null,
      };

      const result = await makeRequest("/cashouts", "POST", body, token);
      return {
        isError: false,
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error creating cashout: ${msg}`,
          },
        ],
      };
    }
  }
);