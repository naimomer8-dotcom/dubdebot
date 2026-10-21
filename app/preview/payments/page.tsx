import { notFound } from "next/navigation";
import PaymentsDashboard from "@/components/admin/PaymentsDashboard";
import type { Payment, PaymentsData } from "@/lib/payments";
import { priceOf, type Billing, type Tier } from "@/lib/plans";

// Design preview of the revenue dashboard with sample rows (rendered only in dev; nothing is written anywhere).
export default async function PreviewPayments({ searchParams }: { searchParams: Promise<{ empty?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  if (sp.empty) return <PaymentsDashboard adminName="עומר" preview={{ payments: [], users: [], requests: [], repLeads: [] }} />;
  const now = Date.now();
  const iso = (d: number) => new Date(now + d * 864e5).toISOString();
  const names = ["מיכל כהן", "יוסי לוי", "דנה אברהם", "אבי מזרחי", "רונית שגיא", "עידו פרץ", "נועה ברק", "שי אלון", "ליאת גל", "תומר רז", "הילה דוד", "גיא נחום"];
  const tiers: Tier[] = ["basic", "private", "basic", "upgrade", "private", "pro", "basic", "private", "basic", "upgrade", "basic", "private"];
  const reps = ["נדב", "שירן", null];
  const payments: Payment[] = names.map((n, i) => {
    const billing: Billing = i % 3 === 0 ? "installments" : "onetime";
    const p = priceOf(tiers[i], billing);
    const self = i % 3 === 2;
    const status = i === 4 ? "pending" : i === 7 ? "refunded" : "paid";
    return {
      id: `00000000-0000-0000-0000-0000000000${String(i).padStart(2, "0")}`, userId: null, name: n, phone: `05${i}1234567`.slice(0, 10), email: `user${i}@example.com`,
      tier: tiers[i], billing, kind: "annual", installments: billing === "installments" ? 12 : 1, net: p.net, vat: p.vat, total: p.total,
      status, channel: self ? "self" : "rep", repName: self ? null : reps[i % 2], method: i % 4 === 1 ? "bit" : "credit", provider: self ? "cardcom" : null,
      ref: self ? `CC-${4800 + i}` : null, notes: null, source: self ? "checkout" : "manual", createdAt: iso(-i * 2.3 - 1), paidAt: status === "pending" ? null : iso(-i * 2.3),
      refundAmount: status === "refunded" ? p.total : null, refundedAt: status === "refunded" ? iso(-2) : null, createdBy: "עומר",
    } as Payment;
  });
  const users = Array.from({ length: 60 }, (_, i) => ({ id: `u${i}`, name: `משתמש ${i}`, email: `u${i}@example.com`, phone: "0500000000", createdAt: iso(-i * 0.5), plan: i < 9 ? "paid" : "trial", tier: i < 9 ? tiers[i] : null, billing: "onetime", accessUntil: iso(i < 9 ? 300 : 20), yearEndsAt: iso(300), renewalMode: "monthly69" }));
  const data: PaymentsData = {
    payments,
    users,
    requests: [
      { key: "o:1", orderId: "00000000-0000-0000-0000-000000000004", userId: null, name: "רונית שגיא", phone: "0541112233", email: "ronit@example.com", tier: "private", billing: "onetime", net: 3338, total: 3938.84, createdAt: iso(-1), via: "rep", note: null },
      { key: "l:2", orderId: null, userId: null, name: "אורי מלכה", phone: "0529998877", email: null, tier: null, billing: null, net: null, total: null, createdAt: iso(-3), via: "renewal", note: "רוצה לשמוע על Pro" },
    ],
    repLeads: [{ userId: "u1", createdAt: iso(-2) }, { userId: "u2", createdAt: iso(-5) }, { userId: "u3", createdAt: iso(-9) }, { userId: "u4", createdAt: iso(-12) }, { userId: "u5", createdAt: iso(-15) }, { userId: "u6", createdAt: iso(-20) }],
  };
  return <PaymentsDashboard adminName="עומר" preview={data} />;
}
