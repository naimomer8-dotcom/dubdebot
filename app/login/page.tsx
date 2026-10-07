import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import AuthClient from "@/components/AuthClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "כניסה | דובדבוט" };

export default async function Login({ searchParams }: { searchParams: Promise<{ email?: string; forgot?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next === "xray" ? "/xray" : sp.next === "vault" ? "/vault" : sp.next === "scan" ? "/scan" : "/chat";
  if (await getSessionUserId()) redirect(next);
  return <AuthClient initialMode={sp.forgot ? "forgot" : "login"} email={(sp.email ?? "").slice(0, 200)} next={next} />;
}
