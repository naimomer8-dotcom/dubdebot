import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";
import { enrollAllCourses } from "@/lib/schooler";

export const runtime = "nodejs";
export const maxDuration = 60;

const j = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

/**
 * Re-syncs the member's course links from Schooler (enrolls if missing; already-enrolled courses just return their link).
 * Paid members only, at most once every 10 minutes. No welcome email on a re-sync.
 */
export async function POST() {
  const s = await getSession();
  if (!s) return j({ error: "unauthorized" }, 401);
  if (s.access.status !== "paid") return j({ error: "not_paid" }, 402);
  const supabase = db();
  const { data: u } = await supabase.from("users").select("email, full_name, phone, course_links, courses_synced_at").eq("id", s.userId).single();
  if (!u) return j({ error: "not_found" }, 404);
  const last = u.courses_synced_at ? new Date(u.courses_synced_at).getTime() : 0;
  if (Date.now() - last < 10 * 60_000 && u.course_links && Object.keys(u.course_links).length) return j({ links: u.course_links, cached: true });
  const r = await enrollAllCourses({ email: u.email, full_name: u.full_name, phone: u.phone }, false);
  const links = { ...((u.course_links as Record<string, string>) ?? {}), ...(r.links ?? {}) };
  await supabase.from("users").update({ course_links: Object.keys(links).length ? links : null, courses_synced_at: new Date().toISOString(), ...(r.ok ? { courses_enrolled_at: new Date().toISOString() } : {}) }).eq("id", s.userId);
  return j({ links, ok: r.ok });
}
