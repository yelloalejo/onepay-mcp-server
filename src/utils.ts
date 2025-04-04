import dotenv from "dotenv";
dotenv.config();

export const API_BASE_URL = "https://api.onepay.la/v1";
export const CARDS_BASE_URL = "https://cards.onepay.la/v1/cards";

/**
 * Cargamos la API Key desde variables de entorno.
 * Si no está, salimos.
 */
export const API_KEY = process.env.ONEPAY_API_KEY;
if (!API_KEY) {
  console.error("Error: ONEPAY_API_KEY environment variable is required");
  setTimeout(() => process.exit(1), 1000);
}

/**
 * Genera un idempotency key único para operaciones POST/PUT/DELETE.
 */
export function generateIdempotencyKey(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Realiza una petición a la API de OnePay (https://api.onepay.la/v1).
 * - endpoint: ruta ej "/customers"
 * - method: GET/POST/PUT/DELETE (por defecto GET)
 * - data: objeto con datos para body (si no es GET) o params (si es GET)
 * - idempotencyToken: valor para la cabecera x-idempotency
 */
export async function makeRequest(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  data?: any,
  idempotencyToken?: string
) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Si es POST/PUT/DELETE y hay token de idempotencia, lo agregamos
  if ((method === "POST" || method === "PUT" || method === "DELETE") && idempotencyToken) {
    headers["x-idempotency"] = idempotencyToken;
  }

  const requestOptions: RequestInit = { method, headers };

  let finalUrl = url;

  // Si es GET y se pasa data, lo tratamos como query string
  if (data && method === "GET") {
    const params = new URLSearchParams();
    Object.entries(data).forEach(([key, val]) => {
      params.append(key, String(val));
    });
    finalUrl += `?${params.toString()}`;
  } else if (data && method !== "GET") {
    requestOptions.body = JSON.stringify(data);
  }

  console.error(`Request -> ${finalUrl} [${method}]`);

  const resp = await fetch(finalUrl, requestOptions);
  if (!resp.ok) {
    let errorMsg = `API Error: ${resp.statusText}`;
    try {
      const errorBody = await resp.json();
      console.error("API Error response:", errorBody);
      if (errorBody && errorBody.message) {
        errorMsg = `API Error: ${errorBody.message}`;
      }
    } catch {}
    throw new Error(errorMsg);
  }
  // Caso de 204 (No Content) u otra
  try {
    return await resp.json();
  } catch {
    return {};
  }
}

/**
 * Realiza una petición a la API de tarjetas (https://cards.onepay.la/v1/cards).
 * Usar si quieres registrar tarjetas con un dominio distinto a la base normal.
 * - method: GET/POST/PUT/DELETE
 * - data: body a enviar
 * - idempotencyToken: string
 */
export async function makeCardsRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  data?: any,
  idempotencyToken?: string
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (idempotencyToken) {
    headers["x-idempotency"] = idempotencyToken;
  }

  const requestOptions: RequestInit = { method, headers };
  if (data && method !== "GET") {
    requestOptions.body = JSON.stringify(data);
  }

  console.error(`Cards Request -> ${CARDS_BASE_URL} [${method}]`);

  const resp = await fetch(CARDS_BASE_URL, requestOptions);
  if (!resp.ok) {
    let errorMsg = `Card API Error: ${resp.statusText}`;
    try {
      const errBody = await resp.json();
      console.error("Card API Error:", errBody);
      if (errBody && errBody.message) {
        errorMsg = `Card API Error: ${errBody.message}`;
      }
    } catch {}
    throw new Error(errorMsg);
  }
  try {
    return await resp.json();
  } catch {
    return {};
  }
}
