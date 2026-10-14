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

/** Schooler requires an upper, lower, digit and one of !@#$%^*_~ */
function makePassword() {
  return `Dv${randomBytes(6).toString("hex")}!7`;
}

function headers() {
  const id = process.env.SCHOOLER_USER_ID;
  const key = process.env.SCHOOLER_USER_KEY;
  if (!id || !key) return null;
  return { "X-User-Id": id, "X-Api-Key": key, "Content-Type": "application/json", Accept: "application/json" };
}

type Attempt = { form: string; status: number; body: string };

async function post(path: string, students: Record<string, unknown>[], attempts?: Attempt[]) {
  const h = headers()!;
  const { "Content-Type": _ct, ...base } = h;
  const form = new URLSearchParams();
  for (const st of students) for (const [k, v] of Object.entries(st)) form.append(`students_data[][${k}]`, String(v));
  // Schooler iterates students_data with .each, so it must arrive as a real array (JSON array or form array)
  const tries: { form: string; init: RequestInit }[] = [
    { form: "json-array", init: { headers: h, body: JSON.stringify({ students_data: students }) } },
    { form: "form-array", init: { headers: { ...base, "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() } },
    { form: "json-string", init: { headers: h, body: JSON.stringify({ students_data: JSON.stringify(students) }) } },
  ];
  let last = { ok: false, status: 0, body: "no attempt" };
  for (const t of tries) {
    const r = await fetch(`${API}${path}`, { method: "POST", ...t.init, signal: AbortSignal.timeout(15000) });
    const body = (await r.text()).slice(0, 500);
    attempts?.push({ form: t.form, status: r.status, body });
    if (r.ok) return { ok: true, status: r.status, body, form: t.form };
    last = { ok: false, status: r.status, body };
    if (r.status === 401 || r.status === 403 || r.status === 404) break;
  }
  return last;
}

/** Diagnostics: lists the courses the API credentials can see (id + name). */
export async function listCourses() {
  const h = headers();
  if (!h) return { ok: false, status: 0, body: "schooler not configured" };
  const r = await fetch(`${API}/courses?per_page=200&page=1`, { headers: h, signal: AbortSignal.timeout(15000) });
  const text = await r.text();
  try {
    const j = JSON.parse(text);
    const list = (j.data ?? j) as { id: number; course_name: string; course_status?: string }[];
    return { ok: r.ok, status: r.status, count: list.length, list: list.map((c) => `${c.id} | ${c.course_name} | ${c.course_status ?? ""}`), meta: j.meta ?? j.pagination ?? null };
  } catch {
    return { ok: r.ok, status: r.status, body: text.slice(0, 1500) };
  }
}

/** Diagnostics: one enrollment with the raw Schooler response. */
export async function enrollOneDebug(courseId: number, user: { email: string; full_name: string; phone?: string | null }) {
  if (!headers()) return { ok: false, status: 0, body: "schooler not configured" };
  const student = { name: user.full_name, email: user.email, student_phone: (user.phone ?? "").replace(/\D/g, ""), password: makePassword(), send_welcome_email_course: true };
  const attempts: Attempt[] = [];
  const res = await post(`/courses/${courseId}/enroll_students`, [student], attempts);
  return { ...res, attempts };
}

/** Pulls { course_id: unique_link } out of an enroll response (new or already-enrolled students). */
function linksFrom(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const j = JSON.parse(body);
    for (const k of ["students_created", "students_exists"]) {
      for (const row of (j?.[k]?.data ?? []) as { course_id?: number; unique_link?: string }[]) {
        if (row.course_id && typeof row.unique_link === "string" && row.unique_link.startsWith("https://")) out[String(row.course_id)] = row.unique_link;
      }
    }
  } catch {}
  return out;
}

/**
 * Enrolls the member in every Alpha course and returns the personal sign-in link of each course.
 * Safe to repeat: Schooler answers an existing student with "students_exists" and the same link.
 * welcome=false for re-syncs, so a member is not emailed again.
 */
export async function enrollAllCourses(user: { email: string; full_name: string; phone?: string | null }, welcome = true) {
  const links: Record<string, string> = {};
  if (!headers()) return { ok: false as const, reason: "schooler not configured", links };
  const student = {
    name: user.full_name,
    email: user.email,
    student_phone: (user.phone ?? "").replace(/\D/g, ""),
    password: makePassword(), // Schooler emails the access details
  };

  const schoolId = process.env.SCHOOLER_SCHOOL_ID;
  if (schoolId) {
    const r = await post(`/schools/${schoolId}/enroll_students`, [{ ...student, join_all: true, send_welcome_email_school: welcome }]);
    return { ok: r.ok, via: "school" as const, results: [r], links: r.ok ? linksFrom(r.body) : links };
  }

  const ids = (process.env.SCHOOLER_COURSE_IDS ?? "").split(",").map((s) => Number(s.trim())).filter(Boolean);
  const courses = ids.length ? ids : ALPHA_COURSE_IDS.map((c) => c.id);
  const results: { id: number; ok: boolean; status: number }[] = [];
  for (const [i, id] of courses.entries()) {
    // welcome email only once (on the first course), the rest are added silently
    const r = await post(`/courses/${id}/enroll_students`, [{ ...student, send_welcome_email_course: welcome && i === 0 }]);
    results.push({ id, ok: r.ok, status: r.status });
    if (r.ok) Object.assign(links, linksFrom(r.body));
  }
  return { ok: results.every((r) => r.ok), via: "courses" as const, results, links };
}

/** Diagnostics: a course's own details (description, lessons) as Schooler returns them, trimmed. */
export async function courseDetails(courseId: number) {
  const h = headers();
  if (!h) return { id: courseId, ok: false, body: "schooler not configured" };
  const out: Record<string, unknown> = { id: courseId };
  for (const path of [`/courses/${courseId}`, `/courses/${courseId}/lessons`, `/courses/${courseId}/chapters`]) {
    try {
      const r = await fetch(`${API}${path}`, { headers: h, signal: AbortSignal.timeout(12000) });
      const text = await r.text();
      out[path] = { status: r.status, body: text.slice(0, 6000) };
    } catch (e) {
      out[path] = { error: String(e) };
    }
  }
  return out;
}
