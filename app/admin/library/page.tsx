import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import LibraryDashboard from "@/components/admin/LibraryDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ספריית וידאו | Duvdevani Platform", robots: { index: false, follow: false } };

export default async function AdminLibrary() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login?next=library");
  return <LibraryDashboard adminName={admin.displayName} />;
}
