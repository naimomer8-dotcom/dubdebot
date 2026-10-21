import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/adminAuth";
import AdminAuth from "@/components/admin/AdminAuth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ניהול | Duvdevani Platform", robots: { index: false, follow: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getAdmin()) redirect((await searchParams).next === "payments" ? "/admin/payments" : "/admin");
  return <AdminAuth mode="login" />;
}
