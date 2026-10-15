import { getAdmin, json } from "@/lib/adminAuth";
import { BUDGET_ILS, monthKey, spentThisMonth } from "@/lib/budget";
import { alert } from "@/lib/alerts";

export const runtime = "nodejs";

/** Back-office: AI budget status for this month. ?test=1 also sends a test alert email to ALERT_EMAIL. */
export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const spent = await spentThisMonth();
  const test = new URL(req.url).searchParams.get("test") === "1"
    ? await alert(`test:${Date.now()}`, "בדיקת התראות", ["זו הודעת בדיקה ממערכת ההתראות של Duvdevani Platform.", `תקציב AI החודש: ₪${spent.toFixed(2)} מתוך ₪${BUDGET_ILS}.`], 0)
    : null;
  return json({ month: monthKey(), spent_ils: Number(spent.toFixed(2)), budget_ils: BUDGET_ILS, pct: Number(((spent / BUDGET_ILS) * 100).toFixed(1)), alert_email: process.env.ALERT_EMAIL || "omern@rnd.org.il", test });
}
