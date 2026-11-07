import { db } from "./supabase";
import { gemini, EMBED_MODEL, EMBED_DIM } from "./gemini";
import { getCaptionCues, windows } from "./vimeo";
import { LIBRARY } from "./courses";

/** Turns one mapped video's captions into searchable knowledge chunks (replaces earlier chunks of that video). */
export async function indexVideo(v: { id: string; name: string; course_id: number | null; lesson: number | null }) {
  const supabase = db();
  const source = `vimeo:${v.id}`;
  const cues = await getCaptionCues(v.id);
  const wins = windows(cues);
  if (!wins.length) {
    await supabase.from("vimeo_videos").update({ indexed_chunks: 0, indexed_at: new Date().toISOString(), index_error: "no captions" }).eq("id", v.id);
    return 0;
  }
  const course = LIBRARY.find((c) => c.id === v.course_id)?.title ?? "";
  const title = course ? `${course}${v.lesson ? `, שיעור ${v.lesson}` : ""}` : v.name;
  await supabase.from("knowledge_chunks").delete().eq("source", source);
  let n = 0;
  for (let i = 0; i < wins.length; i += 40) {
    const part = wins.slice(i, i + 40);
    const res = await gemini().models.embedContent({ model: EMBED_MODEL, contents: part.map((w) => w.text), config: { outputDimensionality: EMBED_DIM, taskType: "RETRIEVAL_DOCUMENT" } });
    const vecs = (res.embeddings ?? []).map((e) => e.values ?? []);
    const rows = part.map((w, j) => ({
      source, source_type: "video", title, url: `https://vimeo.com/${v.id}#t=${w.start}s`, chunk_index: i + j, content: w.text, embedding: vecs[j],
      meta: { video_id: v.id, start: w.start, course_id: v.course_id, lesson: v.lesson, name: v.name },
    }));
    const { error } = await supabase.from("knowledge_chunks").insert(rows);
    if (error) throw new Error(error.message);
    n += rows.length;
  }
  await supabase.from("vimeo_videos").update({ indexed_chunks: n, indexed_at: new Date().toISOString(), index_error: null }).eq("id", v.id);
  return n;
}
