import { notFound } from "next/navigation";
import MoneyClient from "@/components/MoneyClient";
import { scoreMoney } from "@/lib/money";

// Design preview with sample data. Disabled in production.
export default async function PreviewMoney({ searchParams }: { searchParams: Promise<{ fresh?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const fresh = !!(await searchParams).fresh;
  const user = { id: "preview", firstName: "מיכל", fullName: "מיכל כהן", phone: "0501234567", email: "michal@example.com", access: { status: "trial" as const, plan: "trial" as const, accessUntil: new Date(Date.now() + 20 * 864e5).toISOString(), daysLeft: 20, renewalRequestedAt: null, tier: null, renewalMode: "none" } };
  return <MoneyClient user={user} conversations={[]} leadSent={false} initial={fresh ? null : scoreMoney({ m1: 1, m2: 0, m3: 1, m4: 2, m5: 1, m6: 1, m7: 2, m8: 2 })} />;
}
