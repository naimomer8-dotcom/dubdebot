import { getAdmin, json } from "@/lib/adminAuth";
import { ALPHA_COURSE_IDS, courseDetails } from "@/lib/schooler";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Back-office: pulls each platform course's description and lessons from Schooler (read only). */
export async function GET() {
  if (!(await getAdmin())) return json({ error: "unauthorized" }, 401);
  const courses = ALPHA_COURSE_IDS.filter((c) => ![48020, 33704, 33706, 2405, 93621].includes(c.id));
  const out = await Promise.all(courses.map(async (c) => ({ name: c.name, ...(await courseDetails(c.id)) })));
  return json({ courses: out });
}
