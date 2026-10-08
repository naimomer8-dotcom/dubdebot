import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";

const COOKIE = "dd_session";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET missing or too short");
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

/** Cookie = userId.sessionVersion.signature. Bumping users.session_version logs out every device. */
export async function setSession(userId: string, sessionVersion = 1) {
  const store = await cookies();
  const v = `${userId}.${sessionVersion}`;
  store.set(COOKIE, `${v}.${sign(v)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export type Access = { status: "trial" | "paid" | "expired"; plan: string; accessUntil: string; daysLeft: number; renewalRequestedAt: string | null };

export function accessOf(row: { plan?: string | null; access_until?: string | null; renewal_requested_at?: string | null }): Access {
  const until = row.access_until ? new Date(row.access_until).getTime() : Date.now() + 30 * 86400_000;
  const ms = until - Date.now();
  const plan = row.plan === "paid" ? "paid" : "trial";
  return {
    status: ms <= 0 ? "expired" : (plan as "trial" | "paid"),
    plan,
    accessUntil: new Date(until).toISOString(),
    daysLeft: Math.max(0, Math.ceil(ms / 86400_000)),
    renewalRequestedAt: row.renewal_requested_at ?? null,
  };
}

/** Verifies the cookie and returns the user id + subscription access in one DB round trip. */
export async function getSession(): Promise<{ userId: string; access: Access } | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, ver, sig] = parts;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(`${id}.${ver}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await db().from("users").select("session_version, plan, access_until, renewal_requested_at").eq("id", id).maybeSingle();
  if (!data || String(data.session_version) !== ver) return null;
  return { userId: id, access: accessOf(data) };
}

export async function getSessionUserId(): Promise<string | null> {
  return (await getSession())?.userId ?? null;
}

/** For paid features: the user id if logged in AND the subscription is active, otherwise a ready error Response. */
export async function requireActive(): Promise<{ userId: string; access: Access } | Response> {
  const s = await getSession();
  if (!s) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  if (s.access.status === "expired")
    return new Response(JSON.stringify({ error: "expired", message: "תקופת הגישה שלך הסתיימה." }), { status: 402, headers: { "Content-Type": "application/json" } });
  return s;
}
