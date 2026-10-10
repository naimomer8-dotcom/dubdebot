import { requireActive } from "./session";
import { hit, limited } from "./ratelimit";

/**
 * Gate for paid features: logged in + active subscription + per-user rate limit.
 * Returns the user id, or a ready Response (401 / 402 expired / 429 too many).
 */
export async function guard(kind: string, max: number, windowMin: number): Promise<string | Response> {
  const s = await requireActive();
  if (s instanceof Response) return s;
  const key = `u:${s.userId}`;
  if (await limited(key, kind, max, windowMin)) {
    return new Response(JSON.stringify({ error: "יותר מדי בקשות. תן לזה כמה דקות ונמשיך." }), { status: 429, headers: { "Content-Type": "application/json" } });
  }
  void hit(key, kind).catch(() => {});
  return s.userId;
}

/** Same as guard(), but also returns the subscription access (trial / paid) for plan-based limits. */
export async function guardAccess(kind: string, max: number, windowMin: number) {
  const s = await requireActive();
  if (s instanceof Response) return s;
  const key = `u:${s.userId}`;
  if (await limited(key, kind, max, windowMin)) {
    return new Response(JSON.stringify({ error: "יותר מדי בקשות. תן לזה כמה דקות ונמשיך." }), { status: 429, headers: { "Content-Type": "application/json" } });
  }
  void hit(key, kind).catch(() => {});
  return s;
}
