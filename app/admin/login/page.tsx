import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import AdminAuth from "@/components/admin/AdminAuth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ניהול | דובדבוט", robots: { index: false, follow: false } };

export default async function AdminLogin() {
  if (await getAdmin()) redirect("/admin");
  return <AdminAuth mode="login" />;
}
