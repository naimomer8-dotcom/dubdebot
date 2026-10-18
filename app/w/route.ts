import { nextWebinar, webinarLabel, webinarLinks, WEBINAR_TIME, WEBINAR_TITLE, WEBINAR_ZOOM_URL } from "@/lib/webinars";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT = /facebookexternalhit|WhatsApp|Facebot|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot|Googlebot/i;

/** Short stable link used in every WhatsApp/email: always points at the next webinar.
 * Link-preview bots get a branded card instead of Zoom's generic one. */
export async function GET(req: Request) {
  const date = nextWebinar();
  if (BOT.test(req.headers.get("user-agent") ?? "")) {
    const app = new URL(req.url).origin;
    const t = `וובינר חי עם ניר דובדבני · ${WEBINAR_TITLE}`;
    const d = `יום ראשון ${webinarLabel(date)} ב-${WEBINAR_TIME}. לחיצה אחת ואתם בפנים.`;
    const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>${t}</title><meta property="og:title" content="${t}"><meta property="og:description" content="${d}"><meta property="og:image" content="${app}/og-webinar.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image"></head><body>${t}</body></html>`;
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const link = (await webinarLinks().catch(() => ({} as Record<string, string>)))[date];
  return Response.redirect(link || WEBINAR_ZOOM_URL || new URL("/webinar", req.url).toString(), 302);
}
