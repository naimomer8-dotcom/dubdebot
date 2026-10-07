import type { Metadata } from "next";
import AuthClient from "@/components/AuthClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "סיסמה חדשה | דובדבוט", robots: { index: false }, referrer: "no-referrer" };

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const sp = await searchParams;
  return <AuthClient initialMode="reset" token={(sp.token ?? "").slice(0, 200)} />;
}
