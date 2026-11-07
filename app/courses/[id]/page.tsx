import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";
import { loadShell } from "@/lib/data";
import { LIBRARY } from "@/lib/courses";
import ExpiredScreen from "@/components/ExpiredScreen";
import ConsentGate from "@/components/ConsentGate";
import CoursePlayer, { type Lesson } from "@/components/CoursePlayer";

export const dynamic = "force-dynamic";

const courseOf = (id: string) => LIBRARY.find((c) => String(c.id) === id && c.kind === "course") ?? null;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = courseOf((await params).id);
  return { title: c ? `${c.title} | Duvdevani Platform` : "Duvdevani Platform" };
}

export default async function CoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ l?: string; t?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const course = courseOf(id);
  if (!course) notFound();
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const shell = await loadShell(userId);
  if (!shell) redirect("/");
  if (!shell.user.consent) return <ConsentGate firstName={shell.user.firstName} />;
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  const locked = shell.user.access.status !== "paid";
  const { data } = await db().from("vimeo_videos").select("id, name, duration, embed_url, lesson").eq("course_id", course.id).eq("hidden", false).order("lesson", { ascending: true, nullsFirst: false }).limit(300);
  const lessons: Lesson[] = (data ?? []).map((v, i) => ({ id: String(v.id), n: i + 1, title: String(v.name ?? "").replace(/\s+/g, " ").trim(), duration: v.duration ?? 0, embed: locked ? "" : String(v.embed_url ?? "") }));
  return (
    <CoursePlayer user={shell.user} conversations={shell.conversations} course={{ id: course.id, title: course.title, blurb: course.blurb }} lessons={lessons} locked={locked}
      startLesson={Number(sp.l) || null} startAt={Number(sp.t) || 0} />
  );
}
