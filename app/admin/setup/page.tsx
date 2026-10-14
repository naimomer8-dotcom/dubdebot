import type { Metadata } from "next";
import { db } from "@/lib/supabase";
import { sha256 } from "@/lib/password";
import AdminAuth from "@/components/admin/AdminAuth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "הגדרת מנהל | דובדבוט", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function AdminSetup({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = String((await searchParams).token ?? "").slice(0, 200);
  const { data } = token ? await db().from("admins").select("username, display_name, setup_expires_at").eq("setup_token_hash", sha256(token)).maybeSingle() : { data: null };
  if (!data || !data.setup_expires_at || new Date(data.setup_expires_at).getTime() < Date.now()) {
    return (
      <div className="auth-page"><div className="auth-card glass edge"><h1 className="h-display" style={{ fontSize: 40 }}>הקישור לא תקף</h1><p className="muted">ייתכן שכבר השתמשו בו או שפג תוקפו. אפשר להיכנס כאן: <a className="gold" href="/admin/login">כניסת מנהלים</a></p></div></div>
    );
  }
  return <AdminAuth mode="setup" token={token} username={`${data.display_name} (${data.username})`} />;
}
