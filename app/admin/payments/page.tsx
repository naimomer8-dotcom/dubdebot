import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import PaymentsDashboard from "@/components/admin/PaymentsDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "דשבורד הכנסות | Duvdevani Platform", robots: { index: false, follow: false } };

export default async function AdminPayments() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login?next=payments");
  return <PaymentsDashboard adminName={admin.displayName} />;
}
