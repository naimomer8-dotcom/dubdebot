import { db } from "./supabase";
import { accessOf, type Access } from "./session";

export type ShellUser = { id: string; firstName: string; fullName: string; phone: string; email: string; access: Access };
export type ConvItem = { id: string; title: string; mode: string; updated_at: string };

export async function loadShell(userId: string): Promise<{ user: ShellUser; conversations: ConvItem[]; leadSent: boolean } | null> {
  const supabase = db();
  const [{ data: u }, { data: convs }, { count }] = await Promise.all([
    supabase.from("users").select("id, full_name, phone, email, plan, access_until, renewal_requested_at").eq("id", userId).maybeSingle(),
    supabase.from("conversations").select("id, title, mode, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(25),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if (!u) return null;
  return {
    user: { id: u.id, firstName: u.full_name.split(" ")[0], fullName: u.full_name, phone: u.phone, email: u.email, access: accessOf(u) },
    conversations: (convs ?? []).map((c) => ({ ...c, title: c.title || "שיחה" })),
    leadSent: (count ?? 0) > 0,
  };
}
