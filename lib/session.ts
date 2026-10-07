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

export async function getSessionUserId(): Promise<string | null> {
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
  const { data } = await db().from("users").select("session_version").eq("id", id).maybeSingle();
  if (!data || String(data.session_version) !== ver) return null;
  return id;
}
