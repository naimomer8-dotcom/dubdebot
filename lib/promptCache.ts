import { createHash } from "crypto";
import { gemini } from "./gemini";
import { db } from "./supabase";

/**
 * Explicit Gemini context cache for the fixed part of the prompt (Nir's rules + the tool mode).
 * Cached input tokens are billed at a fraction of the normal price, so every message pays less for the
 * ~1,100 tokens that never change. Fully best-effort: any failure returns null and the caller sends the
 * prompt the normal way.
 */
const TTL_SEC = 3600;
const mem = new Map<string, { name: string; exp: number }>();
const inflight = new Map<string, Promise<string | null>>();
const dead = new Set<string>();

export async function cachedPrefix(model: string, systemInstruction: string): Promise<string | null> {
  if (process.env.PROMPT_CACHE === "off") return null;
  const k = `${model}:${createHash("sha256").update(systemInstruction).digest("hex").slice(0, 16)}`;
  const now = Date.now();
  const m = mem.get(k);
  if (m && m.exp > now + 120_000) return m.name || null; // name "" = negative cache (model doesn't support it)
  const running = inflight.get(k);
  if (running) return running;

  const p = (async () => {
    const supabase = db();
    try {
      const { data } = await supabase.from("app_settings").select("value").eq("key", `pcache:${k}`).maybeSingle();
      const v = data?.value as { name?: string; exp?: number } | undefined;
      if (v?.exp && v.exp > now + 120_000 && !(v.name && dead.has(v.name))) {
        mem.set(k, { name: v.name ?? "", exp: v.exp });
        return v.name || null;
      }
      const c = await gemini().caches.create({
        model,
        config: { systemInstruction, ttl: `${TTL_SEC}s`, displayName: `dubdebot-${k.slice(-8)}` },
      });
      if (!c.name) throw new Error("no cache name");
      const exp = now + TTL_SEC * 1000;
      mem.set(k, { name: c.name, exp });
      await supabase.from("app_settings").upsert({ key: `pcache:${k}`, value: { name: c.name, exp }, updated_at: new Date().toISOString() });
      return c.name;
    } catch (e) {
      console.error("prompt cache unavailable", (e as Error).message);
      // don't retry on every message: remember the failure for 30 minutes
      const exp = now + 30 * 60_000;
      mem.set(k, { name: "", exp });
      await Promise.resolve(supabase.from("app_settings").upsert({ key: `pcache:${k}`, value: { name: "", exp }, updated_at: new Date().toISOString() })).catch(() => {});
      return null;
    } finally {
      inflight.delete(k);
    }
  })();
  inflight.set(k, p);
  return p;
}

/** Drop a cache name that the API rejected (expired early), so the next call recreates it. */
export function forgetPrefix(name: string) {
  dead.add(name);
  for (const [k, v] of mem) if (v.name === name) mem.delete(k);
}
