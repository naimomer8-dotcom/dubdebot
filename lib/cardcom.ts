/**
 * Cardcom API v11 (https://secure.cardcom.solutions/api/v11/).
 * Field names verified against Cardcom's published OpenAPI (swagger v11).
 * - LowProfile/Create: hosted payment page (card data never touches our servers)
 * - LowProfile/GetLpResult: the only source of truth for a payment result (the webhook body is never trusted)
 * - Transactions/Transaction: charge a stored token (monthly renewal)
 * Keys come from Vercel env: CARDCOM_TERMINAL, CARDCOM_API_NAME, CARDCOM_API_PASSWORD (never logged).
 */
const BASE = "https://secure.cardcom.solutions/api/v11";

export function cardcomReady() {
  return !!(process.env.CARDCOM_TERMINAL && process.env.CARDCOM_API_NAME) && process.env.PAYMENT_PROVIDER !== "off";
}

function creds() {
  const terminal = Number(process.env.CARDCOM_TERMINAL);
  const apiName = process.env.CARDCOM_API_NAME;
  if (!terminal || !apiName) throw new Error("cardcom not configured");
  return { TerminalNumber: terminal, ApiName: apiName };
}

/** Subscriptions (first payment that saves the card + monthly renewals) run on the tokens / standing-order terminal (200314) when set. Falls back to the main terminal. */
function tokenCreds() {
  const t = Number(process.env.CARDCOM_TOKEN_TERMINAL);
  const name = process.env.CARDCOM_TOKEN_API_NAME || process.env.CARDCOM_API_NAME;
  if (!t || !name) return creds();
  const pass = process.env.CARDCOM_TOKEN_API_PASSWORD;
  return pass ? { TerminalNumber: t, ApiName: name, ApiPassword: pass } : { TerminalNumber: t, ApiName: name };
}

/** Which terminal opens the payment page. The tokens terminal only when CARDCOM_PAGE_ON_TOKEN_TERMINAL=1 (it failed with "unexpected error" on 8.11), otherwise the main one. */
function pageCreds() {
  return process.env.CARDCOM_PAGE_ON_TOKEN_TERMINAL === "1" ? tokenCreds() : creds();
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const j = (await r.json().catch(() => ({}))) as T & { ResponseCode?: number; Description?: string };
  if (!r.ok) throw new Error(`cardcom ${path} http ${r.status}: ${String(j?.Description ?? "").slice(0, 200)}`);
  return j;
}

export const appUrl = () => (process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app").replace(/\/$/, "");

export type LpCreate = { ResponseCode: number; Description?: string; LowProfileId?: string; Url?: string; UrlToBit?: string };

/** Creates the hosted payment page for an order. Amount includes VAT. */
export async function createPaymentPage(o: {
  orderId: string;
  amount: number; // incl. VAT
  payments: number; // 1 or 12
  productName: string;
  customer: { name: string; email: string | null; phone: string | null };
}) {
  const url = appUrl();
  const pay = Math.max(1, Math.min(12, Math.round(o.payments)));
  const body = (op: string) => ({
    ...pageCreds(),
    Operation: op, // ChargeAndCreateToken keeps a token for the monthly renewal after the year
    ReturnValue: o.orderId,
    Amount: o.amount,
    SuccessRedirectUrl: `${url}/pay/thanks?o=${o.orderId}`,
    FailedRedirectUrl: `${url}/pay/failed?o=${o.orderId}`,
    CancelRedirectUrl: `${url}/plans`,
    WebHookUrl: `${url}/api/payments/cardcom?o=${o.orderId}`,
    ProductName: o.productName,
    Language: "he",
    ISOCoinId: 1,
    UIDefinition: {
      CardOwnerNameValue: o.customer.name || undefined,
      CardOwnerEmailValue: o.customer.email || undefined,
      CardOwnerPhoneValue: o.customer.phone || undefined,
      IsCardOwnerEmailRequired: true,
    },
    AdvancedDefinition: { MinNumOfPayments: pay, MaxNumOfPayments: pay, SelectedNumOfPayments: pay },
    Document: {
      DocumentTypeToCreate: "TaxInvoiceAndReceipt",
      Name: (o.customer.name || "לקוח").slice(0, 50),
      Email: o.customer.email || undefined,
      Mobile: o.customer.phone || undefined,
      IsSendByEmail: true,
      Language: "he",
      Products: [{ Description: o.productName.slice(0, 200), Quantity: 1, UnitCost: o.amount, TotalLineCost: o.amount }],
    },
  });
  // terminal without the LowProfile tokens module (error 651) → charge without a token
  const wantToken = process.env.CARDCOM_TOKENS !== "0";
  let r = await post<LpCreate>("LowProfile/Create", body(wantToken ? "ChargeAndCreateToken" : "ChargeOnly"));
  if (wantToken && r.ResponseCode === 651) r = await post<LpCreate>("LowProfile/Create", body("ChargeOnly"));
  return r;
}

export type LpResult = {
  ResponseCode: number;
  Description?: string;
  LowProfileId?: string;
  TranzactionId?: number;
  ReturnValue?: string;
  UIValues?: { CardOwnerEmail?: string; CardOwnerName?: string; CardOwnerPhone?: string; NumOfPayments?: number };
  DocumentInfo?: { ResponseCode?: number; DocumentType?: string; DocumentNumber?: number; DocumentUrl?: string } | null;
  TokenInfo?: { Token?: string; TokenExDate?: string; CardYear?: number; CardMonth?: number } | null;
  TranzactionInfo?: { ResponseCode?: number; TranzactionId?: number; Amount?: number; Last4CardDigitsString?: string; NumberOfPayments?: number; DocumentNumber?: number; DocumentUrl?: string } | null;
};

export async function getPaymentResult(lowProfileId: string) {
  // the page was opened on the tokens terminal when one is set; older pages were opened on the main terminal
  const r = await post<LpResult>("LowProfile/GetLpResult", { ...tokenCreds(), LowProfileId: lowProfileId });
  if (r.ResponseCode === 0 || !process.env.CARDCOM_TOKEN_TERMINAL) return r;
  return post<LpResult>("LowProfile/GetLpResult", { ...creds(), LowProfileId: lowProfileId });
}

export type TranResult = { ResponseCode: number; Description?: string; TranzactionId?: number; Amount?: number; DocumentNumber?: number; DocumentUrl?: string; Last4CardDigitsString?: string };

/** Charges a stored token (used for the monthly renewal). ExternalUniqTranId prevents a double charge. */
export function chargeToken(o: { token: string; expMMYY: string; amount: number; uniqueId: string; productName: string; customer: { name: string; email: string | null; phone: string | null } }) {
  return post<TranResult>("Transactions/Transaction", {
    ...tokenCreds(),
    Amount: o.amount,
    Token: o.token,
    CardExpirationMMYY: o.expMMYY,
    ExternalUniqTranId: o.uniqueId,
    NumOfPayments: 1,
    ISOCoinId: 1,
    CardOwnerInformation: { FullName: o.customer.name, CardOwnerEmail: o.customer.email ?? undefined, Phone: o.customer.phone ?? undefined },
    Document: {
      DocumentTypeToCreate: "TaxInvoiceAndReceipt",
      Name: (o.customer.name || "לקוח").slice(0, 50),
      Email: o.customer.email ?? undefined,
      IsSendByEmail: true,
      Languge: "he",
      Products: [{ Description: o.productName, Quantity: 1, UnitCost: o.amount, TotalLineCost: o.amount }],
    },
  });
}
