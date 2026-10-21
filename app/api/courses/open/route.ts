import { getSession, consentRequired } from "@/lib/session";
import { db } from "@/lib/supabase";
import { alert } from "@/lib/alerts";
import { LIBRARY } from "@/lib/courses";

export const runtime = "nodejs";

/**
 * Records that a member opened a course. Opening the bonus real-estate course marks the member as a lead
 * for the investment academy (event + one alert per member), as Nir asked.
 */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return new Response(null, { status: 204 });
  if (!s.consent) return consentRequired();
  const { id } = (await req.json().catch(() => ({}))) as { id?: number };
  const course = LIBRARY.find((c) => c.id === Number(id));
  if (!course) return new Response(null, { status: 204 });
  const supabase = db();
  await supabase.from("events").insert({ user_id: s.userId, type: "course_opened", meta: { course_id: course.id, title: course.title } });
  if (course.bonus) {
    const { data: u } = await supabase.from("users").select("full_name, phone, email").eq("id", s.userId).single();
    await alert(`realestate:${s.userId}`, "ליד לאקדמיה להשקעות: פתח את מקצוען בנדל״ן", [`${u?.full_name ?? ""} · ${u?.phone ?? ""} · ${u?.email ?? ""}`, "המנוי פתח את קורס הבונוס \"מקצוען בנדל״ן\". שווה שיחה מהאקדמיה להשקעות."], 60 * 24 * 365);
  }
  return new Response(null, { status: 204 });
}
