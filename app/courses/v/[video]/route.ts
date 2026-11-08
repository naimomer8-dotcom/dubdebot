import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

/** Chat video links land here: find the video's course and open the in-app player at that lesson and minute. */
export async function GET(req: Request, { params }: { params: Promise<{ video: string }> }) {
  const { video } = await params;
  const t = Number(new URL(req.url).searchParams.get("t")) || 0;
  const { data } = await db().from("vimeo_videos").select("course_id").eq("id", video).maybeSingle();
  const base = new URL(req.url);
  if (!data?.course_id) return NextResponse.redirect(new URL("/courses", base));
  return NextResponse.redirect(new URL(`/courses/${data.course_id}?v=${encodeURIComponent(video)}&t=${t}`, base));
}
