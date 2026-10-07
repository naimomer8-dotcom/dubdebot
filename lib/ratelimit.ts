import { db } from "./supabase";

/** Simple DB-backed limiter: returns true if `key` already hit `max` attempts of `kind` within `windowMin`. */
export async function limited(key: string, kind: string, max: number, windowMin: number) {
  const since = new Date(Date.now() - windowMin * 60_000).toISOString();
  const { count } = await db().from("auth_attempts").select("id", { count: "exact", head: true }).eq("key", key).eq("kind", kind).gte("created_at", since);
  return (count ?? 0) >= max;
}

export async function hit(key: string, kind: string) {
  await db().from("auth_attempts").insert({ key, kind });
}

export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
