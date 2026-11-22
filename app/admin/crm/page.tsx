import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import CrmBoard from "@/components/admin/CrmBoard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "CRM לידים | Duvdevani Platform", robots: { index: false, follow: false } };

export default async function CrmPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return <CrmBoard adminName={admin.displayName} />;
}
