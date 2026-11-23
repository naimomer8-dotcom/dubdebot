/** Invoice details the customer fills before paying (Cardcom tax invoice-receipt needs the ID / company number). */
export type InvoiceDetails = { name: string; taxId: string; address: string; city: string };

/** Israeli ID (ת.ז) and company number (ח.פ) share the same 9-digit check-digit algorithm. */
export function validTaxId(raw: string) {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length < 5 || d.length > 9) return false;
  const id = d.padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let n = Number(id[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return sum % 10 === 0;
}

/** Normalises and validates what came from the client. Returns null + an error message when it is not usable. */
export function parseInvoice(v: unknown): { ok: true; value: InvoiceDetails } | { ok: false; error: string } {
  const o = (v ?? {}) as Record<string, unknown>;
  const name = String(o.name ?? "").trim().slice(0, 50);
  const taxId = String(o.taxId ?? "").replace(/\D/g, "").slice(0, 9);
  const address = String(o.address ?? "").trim().slice(0, 80);
  const city = String(o.city ?? "").trim().slice(0, 40);
  if (name.length < 2) return { ok: false, error: "צריך למלא שם לחשבונית (שם מלא או שם העסק)." };
  if (!validTaxId(taxId)) return { ok: false, error: "מספר ת.ז / ח.פ לא תקין. בודקים שיש 9 ספרות." };
  return { ok: true, value: { name, taxId: taxId.padStart(9, "0"), address, city } };
}
