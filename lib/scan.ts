import { gemini, FAST_MODEL, LITE_THINKING } from "./gemini";

export type Platform = "instagram" | "facebook" | "tiktok" | "linkedin" | "youtube" | "x" | "website";

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "אינסטגרם",
  facebook: "פייסבוק",
  tiktok: "טיקטוק",
  linkedin: "לינקדאין",
  youtube: "יוטיוב",
  x: "X",
  website: "אתר",
};

export type ScanReport = {
  platform: Platform;
  handle: string;
  display_name: string;
  summary: string;
  score: number;
  stats: { label: string; value: string }[];
  categories: { name: string; score: number; note: string }[];
  failures: { title: string; why: string; fix: string }[];
  quick_wins: string[];
  ideas: { format: string; hook: string; why: string }[];
  confidence: "high" | "medium" | "low";
  data_note: string;
};

export function normalizeUrl(raw: string): URL | null {
  let s = raw.trim();
  if (!s) return null;
  if (s.startsWith("@")) s = `https://www.instagram.com/${s.slice(1)}`;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    const host = u.hostname.toLowerCase();
    // no internal / private targets
    if (host === "localhost" || /^(\d+\.){3}\d+$/.test(host) || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

export function detectPlatform(u: URL): Platform {
  const h = u.hostname.replace(/^www\.|^m\./, "");
  if (h.endsWith("instagram.com")) return "instagram";
  if (h.endsWith("facebook.com") || h === "fb.com") return "facebook";
  if (h.endsWith("tiktok.com")) return "tiktok";
  if (h.endsWith("linkedin.com")) return "linkedin";
  if (h.endsWith("youtube.com") || h === "youtu.be") return "youtube";
  if (h === "x.com" || h.endsWith("twitter.com")) return "x";
  return "website";
}

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

/** True only if every address the host resolves to is public (blocks DNS tricks like 127.0.0.1.nip.io). */
async function isPublicHost(host: string): Promise<boolean> {
  try {
    const { lookup } = await import("dns/promises");
    const addrs = await lookup(host, { all: true });
    if (!addrs.length) return false;
    return addrs.every(({ address: a, family }) => {
      if (family === 6) {
        const x = a.toLowerCase();
        if (x.startsWith("::ffff:")) return isPublicV4(x.slice(7));
        return !(x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80"));
      }
      return isPublicV4(a);
    });
  } catch {
    return false;
  }
}
function isPublicV4(a: string) {
  const [p, q] = a.split(".").map(Number);
  if (p === 10 || p === 127 || p === 0 || p >= 224) return false;
  if (p === 169 && q === 254) return false;
  if (p === 172 && q >= 16 && q <= 31) return false;
  if (p === 192 && q === 168) return false;
  if (p === 100 && q >= 64 && q <= 127) return false;
  return true;
}

/** Best-effort public metadata. Social networks often hide data behind a login – the model also reads the page itself. */
export async function fetchPublic(u: URL): Promise<{ meta: Record<string, string>; text: string }> {
  const meta: Record<string, string> = {};
  let text = "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    let res: Response | null = null;
    let target = u;
    // follow at most 3 redirects manually, re-checking every hop against private networks
    for (let hop = 0; hop < 4; hop++) {
      if (!(await isPublicHost(target.hostname))) break;
      const r = await fetch(target.toString(), {
        signal: ctrl.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
          "Accept-Language": "he-IL,he;q=0.9,en;q=0.8",
        },
      });
      const loc = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && loc) {
        const next = normalizeUrl(new URL(loc, target).toString());
        if (!next) break;
        target = next;
        continue;
      }
      res = r;
      break;
    }
    if (!res) {
      clearTimeout(t);
      return { meta, text };
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") || !res.body) {
      clearTimeout(t);
      return { meta, text };
    }
    // read at most 1.5MB, still under the abort timer
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < 1_500_000) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    clearTimeout(t);
    const html = new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    for (const m of html.matchAll(/<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)) {
      const k = m[1].toLowerCase();
      if (/^(og:|twitter:|description$|keywords$)/.test(k) && !meta[k]) meta[k] = decode(m[2]).slice(0, 600);
    }
    const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1];
    if (title) meta.title = decode(title).trim().slice(0, 200);
    // TikTok embeds profile stats as JSON
    for (const key of ["followerCount", "followingCount", "heartCount", "videoCount", "signature"]) {
      const m = new RegExp(`"${key}":("([^"]*)"|\\d+)`).exec(html);
      if (m) meta[`tiktok:${key}`] = (m[2] ?? m[1]).slice(0, 300);
    }
    text = decode(
      html
        .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
    )
      .trim()
      .slice(0, 6000);
  } catch {}
  return { meta, text };
}

const PROMPT = (url: string, platform: Platform, scraped: string, hasShots: boolean) => `
אתה ניר דובדבני – 22 שנה בליווי עסקים – ועכשיו אתה עושה "סריקת רשת חברתית" לבעל עסק: מסתכל על הנכס הדיגיטלי שלו ואומר לו בדיוק איפה הוא נכשל שיווקית ומה לתקן. עברית, ישיר, חד, בלי ליטופים, בלי הבטחות.

הקישור: ${url}
הפלטפורמה: ${PLATFORM_LABEL[platform]}

מה הצלחנו לשלוף מהעמוד הציבורי:
${scraped || "(כמעט כלום – כנראה העמוד חסום בלי התחברות)"}
${hasShots ? "\nהמשתמש צירף צילומי מסך של הפרופיל / הפוסטים – זה מקור המידע הכי אמין שלך. קרא אותם בעיון (ביו, מספרים, כותרות, ויזואל, תגובות)." : ""}

השתמש גם בכלי קריאת הקישור ובחיפוש כדי ללמוד על העסק והפרופיל. אל תמציא מספרים: אם לא ראית נתון – אל תכתוב אותו. אם המידע דל, תגיד את זה ב-data_note ותוריד את confidence, ותן ביקורת על מה שכן נראה.

בדוק לפי 6 קטגוריות (ציון 0–100 לכל אחת):
1. מיצוב וביו – ברור תוך 3 שניות מה אתה עושה, למי, ולמה אתה?
2. הצעת ערך – יש הבטחה/תוצאה ברורה, או סתם תיאור?
3. תוכן והוקים – הפתיחים עוצרים גלילה? יש ערך או רק פרסומות?
4. עקביות ותדירות – קצב, שפה ויזואלית, פורמטים.
5. CTA ומשפך – יש לאן ללכת? לינק בביו, הצעה, מגנט לידים, וואטסאפ?
6. הוכחה חברתית ואמון – המלצות, תוצאות, פנים, מעורבות.

החזר JSON בלבד (בלי טקסט מסביב) במבנה:
{"platform":"${platform}","handle":"שם המשתמש/העמוד","display_name":"שם העסק","summary":"2 משפטים חדים בקול של ניר – השורה התחתונה","score":0-100,
"stats":[{"label":"עוקבים","value":"..."}],
"categories":[{"name":"מיצוב וביו","score":0-100,"note":"משפט אחד"}, ... 6 קטגוריות],
"failures":[{"title":"איפה אתה נכשל – כותרת קצרה","why":"למה זה עולה לך בלקוחות","fix":"מה לעשות בדיוק, פעולה קונקרטית"}],  // 3–5, מהחמור לקל
"quick_wins":["פעולה שאפשר לעשות היום"],  // 3–5
"ideas":[{"format":"ריל / קרוסלה / סטורי / פוסט","hook":"משפט פתיחה מוכן לשימוש","why":"למה זה יעבוד לעסק הזה"}],  // בדיוק 3
"confidence":"high|medium|low","data_note":"על מה הסריקה מבוססת ומה חסר"}
`;

function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error("no json");
  }
}

const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function sanitize(j: Record<string, unknown>, platform: Platform, url: URL): ScanReport {
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  return {
    platform,
    handle: str(j.handle, 80) || url.pathname.split("/").filter(Boolean)[0] || url.hostname,
    display_name: str(j.display_name, 120),
    summary: str(j.summary, 600),
    score: clamp(j.score),
    stats: arr(j.stats).slice(0, 6).map((s: Record<string, unknown>) => ({ label: str(s?.label, 40), value: str(s?.value, 40) })).filter((s) => s.label && s.value),
    categories: arr(j.categories).slice(0, 6).map((c: Record<string, unknown>) => ({ name: str(c?.name, 40), score: clamp(c?.score), note: str(c?.note, 240) })).filter((c) => c.name),
    failures: arr(j.failures).slice(0, 5).map((f: Record<string, unknown>) => ({ title: str(f?.title, 120), why: str(f?.why, 400), fix: str(f?.fix, 400) })).filter((f) => f.title),
    quick_wins: arr(j.quick_wins).slice(0, 5).map((w) => str(w, 240)).filter(Boolean),
    ideas: arr(j.ideas).slice(0, 3).map((i: Record<string, unknown>) => ({ format: str(i?.format, 40), hook: str(i?.hook, 240), why: str(i?.why, 300) })).filter((i) => i.hook),
    confidence: j.confidence === "high" || j.confidence === "low" ? j.confidence : "medium",
    data_note: str(j.data_note, 400),
  };
}

export async function runScan(url: URL, shots: { mime: string; data: string }[]): Promise<ScanReport> {
  const platform = detectPlatform(url);
  const { meta, text } = await fetchPublic(url);
  const scraped = [
    ...Object.entries(meta).map(([k, v]) => `${k}: ${v}`),
    text ? `טקסט מהעמוד: ${text.slice(0, platform === "website" ? 6000 : 1500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const parts = [
    ...shots.map((s) => ({ inlineData: { mimeType: s.mime, data: s.data } })),
    { text: PROMPT(url.toString(), platform, scraped, shots.length > 0) },
  ];

  const attempt = async (withTools: boolean) => {
    const res = await gemini().models.generateContent({
      model: FAST_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        maxOutputTokens: 6000,
        ...LITE_THINKING,
        ...(withTools ? { tools: [{ urlContext: {} }, { googleSearch: {} }] } : { responseMimeType: "application/json" }),
      },
    });
    return sanitize(extractJson(res.text ?? "") as Record<string, unknown>, platform, url);
  };

  try {
    return await attempt(true);
  } catch (e) {
    console.error("scan with tools failed, retrying plain", String(e).slice(0, 300));
    return await attempt(false);
  }
}

export function reportToMarkdown(r: ScanReport, url: string) {
  const lines = [
    `## סריקת ${PLATFORM_LABEL[r.platform]}: ${r.display_name || r.handle}`,
    `${url}`,
    ``,
    `**ציון שיווקי: ${r.score}/100.** ${r.summary}`,
    ``,
    r.stats.length ? r.stats.map((s) => `${s.label}: ${s.value}`).join(" · ") : "",
    ``,
    `### איפה אתה נכשל`,
    ...r.failures.map((f, i) => `${i + 1}. **${f.title}** – ${f.why}\n   ← ${f.fix}`),
    ``,
    `### ציונים לפי קטגוריה`,
    `| קטגוריה | ציון | הערה |`,
    `|---|---|---|`,
    ...r.categories.map((c) => `| ${c.name} | ${c.score} | ${c.note} |`),
    ``,
    `### מה עושים היום`,
    ...r.quick_wins.map((w) => `- ${w}`),
    ``,
    `### 3 רעיונות לתוכן`,
    ...r.ideas.map((i) => `- **${i.format}:** "${i.hook}" – ${i.why}`),
    ``,
    r.data_note ? `_${r.data_note}_` : "",
  ];
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}
