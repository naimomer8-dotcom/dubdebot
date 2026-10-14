import { getAdmin, json } from "@/lib/adminAuth";
import { enrollAllCourses } from "@/lib/schooler";

export const runtime = "nodejs";

/**
 * Back-office: checks the Schooler connection by enrolling ONE test address in all Alpha courses.
 * Only the internal test address is allowed, so this can never open courses for a real customer.
 */
const TEST_EMAIL = "omern@rnd.org.il";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const configured = { userId: !!process.env.SCHOOLER_USER_ID, userKey: !!process.env.SCHOOLER_USER_KEY, schoolId: !!process.env.SCHOOLER_SCHOOL_ID };
  const r = await enrollAllCourses({ email: TEST_EMAIL, full_name: "עומר נעים (בדיקה)", phone: "0524618086" });
  return json({ configured, ...r });
}
