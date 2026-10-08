/** Monthly P&L + balance basics a user types in. Pure functions – no AI calls. */
export const FIN_FIELDS = [
  { key: "revenue", label: "הכנסות (מחזור)", group: "pl" },
  { key: "cogs", label: "עלות המכר / חומרים", group: "pl" },
  { key: "salaries", label: "שכר עובדים", group: "pl" },
  { key: "rent", label: "שכירות ואחזקה", group: "pl" },
  { key: "marketing", label: "שיווק ופרסום", group: "pl" },
  { key: "other", label: "הוצאות אחרות", group: "pl" },
  { key: "owner", label: "משיכות / שכר בעלים", group: "pl" },
  { key: "cash", label: "יתרה בבנק", group: "bs" },
  { key: "receivables", label: "לקוחות חייבים לי", group: "bs" },
  { key: "debts", label: "הלוואות וחובות", group: "bs" },
] as const;

export type FinKey = (typeof FIN_FIELDS)[number]["key"];
export type FinData = Partial<Record<FinKey, number>>;
export type FinRow = { period: string; data: FinData };

export function calc(d: FinData) {
  const n = (k: FinKey) => Number(d[k] ?? 0) || 0;
  const revenue = n("revenue");
  const gross = revenue - n("cogs");
  const opex = n("salaries") + n("rent") + n("marketing") + n("other");
  const operating = gross - opex;
  const net = operating - n("owner");
  const pct = (x: number) => (revenue ? Math.round((x / revenue) * 100) : 0);
  return { revenue, gross, grossPct: pct(gross), opex, operating, operatingPct: pct(operating), net, netPct: pct(net), marketingPct: pct(n("marketing")), salariesPct: pct(n("salaries")), cash: n("cash"), receivables: n("receivables"), debts: n("debts") };
}

export function clean(raw: unknown): FinData {
  const out: FinData = {};
  const r = (raw ?? {}) as Record<string, unknown>;
  for (const f of FIN_FIELDS) {
    const v = Number(String(r[f.key] ?? "").replace(/[,₪\s]/g, ""));
    if (Number.isFinite(v) && v !== 0 && Math.abs(v) < 1e10) out[f.key] = Math.round(v);
  }
  return out;
}

const k = (x: number) => (Math.abs(x) >= 1000 ? `${Math.round(x / 100) / 10}K` : String(x));

/** Compact line for the chat prompt (cheap in tokens). */
export function toPrompt(rows: FinRow[]): string {
  if (!rows.length) return "";
  return rows
    .map((r) => {
      const c = calc(r.data);
      const parts = [`הכנסות ${k(c.revenue)}`, `רווח גולמי ${k(c.gross)} (${c.grossPct}%)`, `הוצאות תפעול ${k(c.opex)}`, `רווח תפעולי ${k(c.operating)} (${c.operatingPct}%)`];
      if (r.data.marketing) parts.push(`שיווק ${c.marketingPct}% מההכנסות`);
      if (r.data.cash) parts.push(`בבנק ${k(c.cash)}`);
      if (r.data.receivables) parts.push(`חייבים ${k(c.receivables)}`);
      if (r.data.debts) parts.push(`חובות ${k(c.debts)}`);
      return `${r.period}: ${parts.join(", ")}`;
    })
    .join("\n");
}
