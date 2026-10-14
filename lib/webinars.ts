import { db } from "@/lib/supabase";
export * from "./webinarDates";

/** Registration/entry links per date, kept in app_settings "webinar_links" as { "2026-11-30": "https://..." }. */
export async function webinarLinks(): Promise<Record<string, string>> {
  const { data } = await db().from("app_settings").select("value").eq("key", "webinar_links").maybeSingle();
  return (data?.value as Record<string, string>) ?? {};
}
