import { COURSES } from "./plans";

/**
 * Rav Messer / Schooler: opens all digital courses for a paying member.
 * Credentials come only from env (SCHOOLER_USER_ID, SCHOOLER_USER_KEY); course ids from SCHOOLER_COURSE_IDS
 * (comma separated, same order as COURSES). Until the API contract is confirmed this returns
 * { ok:false, reason } and the purchase still succeeds – the admin panel shows who still needs access.
 */
export async function enrollAllCourses(user: { email: string; full_name: string; phone?: string | null }) {
  const id = process.env.SCHOOLER_USER_ID;
  const key = process.env.SCHOOLER_USER_KEY;
  const courseIds = (process.env.SCHOOLER_COURSE_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!id || !key || !courseIds.length) return { ok: false as const, reason: "schooler not configured", courses: COURSES.length };
  // The concrete call is wired once the documentation is confirmed (see TODO in the process doc).
  return { ok: false as const, reason: "schooler API contract pending", courses: courseIds.length, email: user.email };
}
