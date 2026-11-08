import { getAdmin, json } from "@/lib/adminAuth";
import { db } from "@/lib/supabase";
import { listAllVideos, whoAmI, allowEmbedDomain } from "@/lib/vimeo";
import { LIBRARY } from "@/lib/courses";
import { indexVideo } from "@/lib/videoIndex";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Back-office: the Vimeo library (videos + their course/lesson mapping). */
export async function GET() {
  if (!(await getAdmin())) return json({ error: "unauthorized" }, 401);
  // the database returns at most 1,000 rows per request, so page through
  const videos: unknown[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await db().from("vimeo_videos").select("*").order("vimeo_created_at", { ascending: false, nullsFirst: false }).order("id").range(from, from + 999);
    if (error) return json({ error: error.message }, 500);
    videos.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return json({ videos, courses: LIBRARY.filter((c) => c.kind === "course").map((c) => ({ id: c.id, title: c.title })) });
}

/**
 * POST { action: "sync" }  pulls every video from Vimeo (read-only) and upserts it, keeping the mapping.
 * POST { action: "map", id, course_id, lesson, hidden }  saves the mapping for one video.
 */
export async function POST(req: Request) {
  if (!(await getAdmin())) return json({ error: "unauthorized" }, 401);
  const body = await req.json().catch(() => null);
  const supabase = db();

  if (body?.action === "sync") {
    let account = "";
    try { account = await whoAmI(); } catch (e) { return json({ error: String(e).slice(0, 300) }, 502); }
    const videos = await listAllVideos();
    const now = new Date().toISOString();
    for (let i = 0; i < videos.length; i += 200) {
      const rows = videos.slice(i, i + 200).map((v) => ({ ...v, synced_at: now }));
      const { error } = await supabase.from("vimeo_videos").upsert(rows, { onConflict: "id" });
      if (error) return json({ error: error.message }, 500);
    }
    return json({ ok: true, account, synced: videos.length, withCaptions: videos.filter((v) => v.texttracks > 0).length });
  }

  if (body?.action === "map") {
    const id = String(body.id ?? "");
    const courseId = body.course_id === null || body.course_id === "" ? null : Number(body.course_id);
    const lesson = body.lesson === null || body.lesson === "" ? null : Number(body.lesson);
    if (!id || (courseId !== null && !LIBRARY.some((c) => c.id === courseId)) || (lesson !== null && !(lesson > 0 && lesson < 1000))) {
      return json({ error: "invalid" }, 400);
    }
    const { error } = await supabase.from("vimeo_videos")
      .update({ course_id: courseId, lesson, hidden: Boolean(body.hidden), mapped_at: new Date().toISOString(), indexed_at: null })
      .eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (body?.action === "index") {
    // a few mapped videos with captions per call; the screen keeps calling until nothing is left
    const { data: todo } = await supabase.from("vimeo_videos").select("id, name, course_id, lesson")
      .not("course_id", "is", null).eq("hidden", false).gt("texttracks", 0).is("indexed_at", null).limit(4);
    const done: { id: string; chunks?: number; error?: string }[] = [];
    for (const v of todo ?? []) {
      try { done.push({ id: v.id, chunks: await indexVideo(v) }); }
      catch (e) {
        const msg = String(e).slice(0, 200);
        await supabase.from("vimeo_videos").update({ indexed_at: new Date().toISOString(), index_error: msg }).eq("id", v.id);
        done.push({ id: v.id, error: msg });
      }
    }
    const { count } = await supabase.from("vimeo_videos").select("id", { count: "exact", head: true })
      .not("course_id", "is", null).eq("hidden", false).gt("texttracks", 0).is("indexed_at", null);
    return json({ ok: true, done, left: count ?? 0 });
  }

  if (body?.action === "allow_domain") {
    // every course video gets our app domain on its embed allow-list, so lessons play inside the app
    const domain = new URL(process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app").host;
    const { data: vids } = await supabase.from("vimeo_videos").select("id").not("course_id", "is", null).eq("hidden", false).limit(1000);
    const ids = (vids ?? []).map((v) => String(v.id));
    let ok = 0; const fails: { id: string; status?: number; error?: string }[] = [];
    for (let i = 0; i < ids.length; i += 8) {
      const res = await Promise.all(ids.slice(i, i + 8).map((id) => allowEmbedDomain(id, domain).then((r) => ({ id, ...r }))));
      for (const r of res) r.ok ? ok++ : fails.push({ id: r.id, status: r.status, error: r.error });
      if (fails.length && fails.every((f) => f.status === 403 || f.status === 401) && ok === 0 && i >= 8) break; // token without "edit" scope
    }
    return json({ ok: true, domain, total: ids.length, allowed: ok, failed: fails.length, sample: fails.slice(0, 3) });
  }

  return json({ error: "unknown action" }, 400);
}
