import { notFound } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";

// Design preview of the back office with sample rows. Disabled in production.
export default function PreviewAdmin() {
  if (process.env.NODE_ENV === "production") notFound();
  const now = Date.now();
  const iso = (days: number) => new Date(now + days * 864e5).toISOString();
  const base = { billing: null, paidAt: null, paidBy: null, note: null, answersToday: 0 };
  const users = [
    { ...base, id: "00000000-0000-0000-0000-000000000001", name: "מיכל כהן", email: "michal@example.com", phone: "0501234567", createdAt: iso(-12), status: "trial" as const, tier: null, accessUntil: iso(18), daysLeft: 18, renewalRequestedAt: iso(-1), business: "סטודיו לפילאטיס · ראשון לציון", conversations: 7, lastActive: iso(-1), answers30: 42, cost30: 1.84, money: 46, moneyLevel: "הכסף מתעורר" },
    { ...base, id: "00000000-0000-0000-0000-000000000002", name: "יוסי לוי", email: "yossi@example.com", phone: "0527654321", createdAt: iso(-60), status: "paid" as const, tier: "private", billing: "onetime", accessUntil: iso(300), daysLeft: 300, renewalRequestedAt: null, paidAt: iso(-30), paidBy: "נדב", business: "משרד רואי חשבון", conversations: 23, lastActive: iso(-3), answers30: 120, cost30: 6.2, money: 78, moneyLevel: "הכסף ער", note: "מעוניין בפגישה עם ניר בינואר" },
    { ...base, id: "00000000-0000-0000-0000-000000000003", name: "דנה אברהם", email: "dana@example.com", phone: "0541112233", createdAt: iso(-40), status: "expired" as const, tier: null, accessUntil: iso(-10), daysLeft: 0, renewalRequestedAt: null, business: null, conversations: 1, lastActive: iso(-35), answers30: 0, cost30: 0, money: null, moneyLevel: null },
  ];
  return <AdminDashboard adminName="עומר" preview={{ users, leads: [] }} />;
}
