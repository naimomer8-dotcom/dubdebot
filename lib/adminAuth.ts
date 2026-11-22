import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";

const COOKIE = "dd_admin";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function sign(v: string) {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET missing");
  return createHmac("sha256", `${s}::backoffice`).update(v).digest("base64url");
}

export async function setAdminSession(adminId: string, ver: number) {
  const v = `${adminId}.${ver}`;
  (await cookies()).set(COOKIE, `${v}.${sign(v)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: MAX_AGE });
}

export async function clearAdminSession() {
  (await cookies()).set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}

/** dataSince: when set (an external partner, e.g. Olmo), this admin does not see purchases or paying customers from before that time. */
export type Admin = { id: string; username: string; displayName: string; dataSince: string | null };

export async function getAdmin(): Promise<Admin | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, ver, sig] = raw.split(".");
  if (!id || !ver || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(`${id}.${ver}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const { data } = await db().from("admins").select("id, username, display_name, session_version, password_hash, data_since").eq("id", id).maybeSingle();
  if (!data || !data.password_hash || String(data.session_version) !== ver) return null;
  return { id: data.id, username: data.username, displayName: data.display_name, dataSince: (data.data_since as string | null) ?? null };
}

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** True when this admin must not see something that happened at `iso` (before their data_since cutoff). */
export const hiddenFor = (admin: Admin, iso: string | null | undefined) => !!admin.dataSince && !!iso && Date.parse(iso) < Date.parse(admin.dataSince);
