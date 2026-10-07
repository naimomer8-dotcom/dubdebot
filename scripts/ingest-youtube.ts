/**
 * Ingest transcripts from Nir's YouTube channel.
 * Needs YOUTUBE_API_KEY (YouTube Data API v3) in .env.
 *   npm run ingest:youtube            (all videos)
 *   npm run ingest:youtube -- --limit 50
 */
import { YoutubeTranscript } from "youtube-transcript";
import { supabase, upsertSource } from "./lib";

const KEY = process.env.YOUTUBE_API_KEY!;
const HANDLE = process.env.YOUTUBE_CHANNEL_HANDLE || "@NirDuvdevani";
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

async function yt(pathAndQuery: string) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${pathAndQuery}&key=${KEY}`);
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${await res.text()}`);
  return res.json();
}

(async () => {
  if (!KEY) throw new Error("missing YOUTUBE_API_KEY");
  const ch = await yt(`channels?part=contentDetails&forHandle=${encodeURIComponent(HANDLE)}`);
  const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("channel not found");

  const videos: { id: string; title: string }[] = [];
  let page = "";
  do {
    const r = await yt(`playlistItems?part=snippet&maxResults=50&playlistId=${uploads}${page ? `&pageToken=${page}` : ""}`);
    for (const it of r.items ?? []) videos.push({ id: it.snippet.resourceId.videoId, title: it.snippet.title });
    page = r.nextPageToken ?? "";
  } while (page && videos.length < LIMIT);

  const { data: done } = await supabase.from("knowledge_chunks").select("url").eq("source_type", "youtube");
  const already = new Set((done ?? []).map((d) => d.url));

  let ok = 0;
  for (const v of videos.slice(0, LIMIT)) {
    const url = `https://www.youtube.com/watch?v=${v.id}`;
    if (already.has(url)) continue;
    try {
      let items;
      try {
        items = await YoutubeTranscript.fetchTranscript(v.id, { lang: "iw" });
      } catch {
        items = await YoutubeTranscript.fetchTranscript(v.id);
      }
      const text = items.map((i) => i.text).join(" ").replace(/\s+/g, " ");
      if (text.length < 300) {
        console.log(`⏭  ${v.title} (no transcript)`);
        continue;
      }
      // split long transcripts into paragraphs of ~6 sentences so the chunker has boundaries
      const paragraphed = text.replace(/((?:[^.?!]+[.?!]\s*){6})/g, "$1\n\n");
      const n = await upsertSource({ source: `יוטיוב: ${v.title}`, sourceType: "youtube", title: v.title, url, text: paragraphed });
      console.log(`🎬 ${v.title} → ${n} chunks`);
      ok++;
    } catch (e) {
      console.log(`⚠️  ${v.title}: ${(e as Error).message}`);
    }
  }
  console.log(`\nDone. ${ok} new videos indexed.`);
})();
