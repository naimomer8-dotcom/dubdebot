import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import AdminAuth from "@/components/admin/AdminAuth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ניהול | Duvdevani Platform", robots: { index: false, follow: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next;
  if (await getAdmin()) redirect(next === "payments" ? "/admin/payments" : next === "library" ? "/admin/library" : "/admin");
  return <AdminAuth mode="login" />;
}
