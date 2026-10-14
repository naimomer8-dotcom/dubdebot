import { nextWebinar, webinarLinks } from "@/lib/webinars";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Short stable link used in every WhatsApp/email: always points at the next webinar. */
export async function GET(req: Request) {
  const date = nextWebinar();
  const link = (await webinarLinks().catch(() => ({} as Record<string, string>)))[date];
  return Response.redirect(link || new URL("/webinar", req.url).toString(), 302);
}
