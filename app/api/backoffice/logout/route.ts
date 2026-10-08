import { clearAdminSession, json } from "@/lib/adminAuth";

export async function POST() {
  await clearAdminSession();
  return json({ ok: true });
}
