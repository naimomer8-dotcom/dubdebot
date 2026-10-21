/** Shared shapes + labels for the revenue dashboard (client and server). */
export const PAY_STATUSES = ["paid", "pending", "failed", "refunded", "cancelled"] as const;
export type PayStatus = (typeof PAY_STATUSES)[number];
export const PAY_CHANNELS = ["self", "rep"] as const;
export type PayChannel = (typeof PAY_CHANNELS)[number] | "admin";
export const PAY_METHODS = ["credit", "bit", "transfer", "other"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export const STATUS_LABEL: Record<PayStatus, string> = { paid: "שולם", pending: "ממתין", failed: "נכשל", refunded: "הוחזר", cancelled: "בוטל" };
export const CHANNEL_LABEL: Record<string, string> = { self: "סליקה עצמית", rep: "דרך נציג", admin: "דרך נציג" };
export const METHOD_LABEL: Record<PayMethod, string> = { credit: "אשראי", bit: "ביט", transfer: "העברה בנקאית", other: "אחר" };

export type Payment = {
  id: string;
  userId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  tier: string;
  billing: string;
  kind: string;
  installments: number;
  net: number;
  vat: number;
  total: number;
  status: PayStatus;
  channel: "self" | "rep";
  repName: string | null;
  method: PayMethod | null;
  provider: string | null;
  ref: string | null;
  notes: string | null;
  source: string;
  createdAt: string;
  paidAt: string | null;
  refundAmount: number | null; // incl. VAT
  refundedAt: string | null;
  createdBy: string | null; // admin display name
};

export type PayUser = { id: string; name: string; email: string; phone: string; createdAt: string; plan: string; tier: string | null; billing: string | null; accessUntil: string; yearEndsAt: string | null; renewalMode: string };

export type RepRequest = {
  key: string;
  orderId: string | null;
  userId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  tier: string | null;
  billing: string | null;
  net: number | null;
  total: number | null;
  createdAt: string;
  via: "rep" | "self" | "renewal";
  note: string | null;
};

export type PaymentsData = { payments: Payment[]; users: PayUser[]; requests: RepRequest[]; repLeads: { userId: string | null; createdAt: string }[] };

export const VAT_RATE = 0.18;
export const round2 = (n: number) => Math.round(n * 100) / 100;
