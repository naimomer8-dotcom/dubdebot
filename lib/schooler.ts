import { randomBytes } from "crypto";

/**
 * Rav Messer / Schooler (api.schooler.biz) – opens all Alpha courses and books for a paying member.
 * Auth: X-User-Id (teacher email) + X-Api-Key (User Key), from env only:
 *   SCHOOLER_USER_ID, SCHOOLER_USER_KEY
 * Target, one of:
 *   SCHOOLER_SCHOOL_ID  – a school that bundles all Alpha courses (preferred: one call, join_all)
 *   SCHOOLER_COURSE_IDS – comma separated course ids (enrolled one by one)
 * Defaults to the course ids mapped from Nir's account (see ALPHA_COURSE_IDS).
 */
const API = "https://api.schooler.biz/api/v1";

/** Course ids in Nir's Schooler account (teacher 430), mapped by name on 12.10.2026. */
export const ALPHA_COURSE_IDS: { id: number; name: string }[] = [
  { id: 111779, name: "מקצוען בנדל״ן" },
  { id: 110990, name: "מקצוענים בכסף" },
  { id: 110992, name: "מקצוען ב-AI" },
  { id: 116394, name: "המבוא לאסטרטגיית הון" },
  { id: 6527, name: "(לא) פשוט להיות עסק אלפא" },
  { id: 50, name: "פשוט למכור הרבה יותר" },
  { id: 1366, name: "שפת גוף של כוכב מכירות" },
  { id: 10426, name: "פשוט לעשות קורס / מוצר דיגיטלי שיימכר" },
  { id: 16892, name: "קורס NLP עסקי" },
  // books (digital editions)
  { id: 48020, name: "3 הספרים של ניר דובדבני" },
  { id: 33704, name: "הספר להיות אלפא בעסקים" },
  { id: 33706, name: "הספר המחיר למשתפן" },
  { id: 2405, name: "הספר בסוף יצא לך ארנב" },
  { id: 93621, name: "האדם מחפש עצמאות" },
];

function headers() {
  const id = process.env.SCHOOLER_USER_ID;
  const key = process.env.SCHOOLER_USER_KEY;
  if (!id || !key) return null;
  return { "X-User-Id": id, "X-Api-Key": key, "Content-Type": "application/json", Accept: "application/json" };
}

async function post(path: string, students: unknown[]) {
  const h = headers()!;
  let last = { ok: false, status: 400, body: "rejected" };
  // the spec types students_data as a JSON string; send it as an array first, then as a string
  for (const payload of [{ students_data: students }, { students_data: JSON.stringify(students) }]) {
    const r = await fetch(`${API}${path}`, { method: "POST", headers: h, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
    const body = await r.text();
    if (r.ok) return { ok: true, status: r.status, body: body.slice(0, 500) };
    if (r.status !== 400 && r.status !== 422 && r.status !== 500) return { ok: false, status: r.status, body: body.slice(0, 500) };
    last = { ok: false, status: r.status, body: body.slice(0, 500) };
  }
  return last;
}

/** Diagnostics: lists the courses the API credentials can see (id + name). */
export async function listCourses() {
  const h = headers();
  if (!h) return { ok: false, status: 0, body: "schooler not configured" };
  const r = await fetch(`${API}/courses`, { headers: h, signal: AbortSignal.timeout(15000) });
  const body = await r.text();
  return { ok: r.ok, status: r.status, body: body.slice(0, 3000) };
}

/** Diagnostics: one enrollment with the raw Schooler response. */
export async function enrollOneDebug(courseId: number, user: { email: string; full_name: string; phone?: string | null }) {
  if (!headers()) return { ok: false, status: 0, body: "schooler not configured" };
  const student = { name: user.full_name, email: user.email, student_phone: (user.phone ?? "").replace(/\D/g, ""), password: randomBytes(9).toString("base64url"), send_welcome_email_course: true };
  return post(`/courses/${courseId}/enroll_students`, [student]);
}

export async function enrollAllCourses(user: { email: string; full_name: string; phone?: string | null }) {
  if (!headers()) return { ok: false as const, reason: "schooler not configured" };
  const student = {
    name: user.full_name,
    email: user.email,
    student_phone: (user.phone ?? "").replace(/\D/g, ""),
    password: randomBytes(9).toString("base64url"), // Schooler emails the access details
  };

  const schoolId = process.env.SCHOOLER_SCHOOL_ID;
  if (schoolId) {
    const r = await post(`/schools/${schoolId}/enroll_students`, [{ ...student, join_all: true, send_welcome_email_school: true }]);
    return { ok: r.ok, via: "school" as const, results: [r] };
  }

  const ids = (process.env.SCHOOLER_COURSE_IDS ?? "").split(",").map((s) => Number(s.trim())).filter(Boolean);
  const courses = ids.length ? ids : ALPHA_COURSE_IDS.map((c) => c.id);
  const results: { id: number; ok: boolean; status: number }[] = [];
  for (const [i, id] of courses.entries()) {
    // welcome email only once (on the first course), the rest are added silently
    const r = await post(`/courses/${id}/enroll_students`, [{ ...student, send_welcome_email_course: i === 0 }]);
    results.push({ id, ok: r.ok, status: r.status });
  }
  return { ok: results.every((r) => r.ok), via: "courses" as const, results };
}
