import { requireActive } from "@/lib/session";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { hit, limited } from "@/lib/ratelimit";
import { PLATFORM_LABEL, normalizeUrl, reportToMarkdown, runScan } from "@/lib/scan";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Social / website marketing scan → report JSON, saved to the user's vault with quick wins as tasks. */
export async function POST(req: Request) {
  const gate = await requireActive();
  if (gate instanceof Response) return gate;
  const userId = gate.userId;
  const body = await req.json().catch(() => ({}));
  const url = normalizeUrl(String(body.url ?? ""));
  if (!url) return NextResponse.json({ error: "הקישור לא נראה תקין. הדבק קישור מלא לפרופיל או לאתר." }, { status: 400 });

  if (await limited(`u:${userId}`, "scan", 8, 60 * 24)) {
    return NextResponse.json({ error: "הגעת למכסת הסריקות היומית. נסה שוב מחר." }, { status: 429 });
  }
  await hit(`u:${userId}`, "scan");

  let budget = 3_200_000;
  const shots: { mime: string; data: string }[] = [];
  for (const s of Array.isArray(body.shots) ? body.shots.slice(0, 4) : []) {
    if (typeof s?.data !== "string" || !/^image\/(jpeg|png|webp)$/.test(String(s?.mime))) continue;
    const bytes = Math.floor((s.data.length * 3) / 4);
    if (bytes > budget) continue;
    budget -= bytes;
    shots.push({ mime: s.mime, data: s.data });
  }

  let report;
  try {
    report = await runScan(url, shots);
  } catch (e) {
    console.error("scan failed", e);
    return NextResponse.json({ error: "לא הצלחתי לסרוק את הקישור הזה כרגע. נסה שוב, או צרף צילומי מסך של הפרופיל." }, { status: 502 });
  }

  const supabase = db();
  const title = `סריקת ${PLATFORM_LABEL[report.platform]}: ${report.display_name || report.handle}`.slice(0, 80);
  const { data: d } = await supabase
    .from("deliverables")
    .insert({ user_id: userId, kind: "social_scan", title, content: reportToMarkdown(report, url.toString()) })
    .select("id")
    .single();
  if (d && report.quick_wins.length) {
    await supabase.from("tasks").insert(report.quick_wins.map((t, i) => ({ user_id: userId, deliverable_id: d.id, text: t, priority: i === 0 ? "urgent" : "important", position: i })));
  }
  await supabase.from("events").insert({ user_id: userId, type: "social_scan", meta: { platform: report.platform, score: report.score, shots: shots.length } });
  return NextResponse.json({ ok: true, report, url: url.toString(), deliverableId: d?.id ?? null });
}
