/**
 * "התיק העסקי" – everything the platform knows about one member, as a Hebrew RTL Word document.
 * Built for the admin before a meeting. Server-only: called from an admin-gated route.
 */
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, LevelFormat, Packer, PageBreak, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";
import { db } from "./supabase";
import { accessOf } from "./session";
import { planById, ils } from "./plans";
import { AXES, ARCHETYPES, QUESTIONS, type Scores } from "./xray";
import { calc, FIN_FIELDS, type FinData } from "./financials";
import { MONEY_DIMS, MONEY_QUESTIONS, WORKSHOP, dimLabel, moneyFromProfile } from "./money";
import { STAGES } from "./journeys";
import { nextWebinar, webinarLabel, WEBINAR_TIME, WEBINAR_TITLE } from "./webinarDates";
import { TOOLS } from "./persona";
import { gemini, FAST_MODEL, LITE_THINKING } from "./gemini";
import { overBudget, recordSpend } from "./budget";

const FONT = "Arial";
const GOLD = "8C6F42";
const INK = "16130E";
const MUTED = "6F675B";

// ---------- small docx helpers (everything RTL) ----------
type RunOpts = { bold?: boolean; size?: number; color?: string; italics?: boolean };
const run = (text: string, o: RunOpts = {}) =>
  new TextRun({ text, rightToLeft: true, font: FONT, bold: o.bold, boldComplexScript: o.bold, italics: o.italics, italicsComplexScript: o.italics, size: o.size ?? 21, sizeComplexScript: o.size ?? 21, color: o.color ?? INK });

/** Inline **bold** support for markdown-ish text. */
function runs(text: string, o: RunOpts = {}) {
  const out: TextRun[] = [];
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith("**") && p.endsWith("**")) out.push(run(p.slice(2, -2), { ...o, bold: true }));
    else out.push(run(p.replace(/`/g, ""), o));
  }
  return out.length ? out : [run("", o)];
}

const para = (text: string, o: RunOpts & { after?: number; align?: "start" | "center" } = {}) =>
  new Paragraph({ bidirectional: true, alignment: o.align === "center" ? AlignmentType.CENTER : AlignmentType.START, spacing: { after: o.after ?? 120, line: 300 }, children: runs(text, o) });

const h1 = (text: string) =>
  new Paragraph({ heading: HeadingLevel.HEADING_1, bidirectional: true, pageBreakBefore: true, spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "C9A46A", space: 6 } }, children: [run(text, { bold: true, size: 36, color: INK })] });
const h2 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, bidirectional: true, spacing: { before: 240, after: 120 }, children: [run(text, { bold: true, size: 27, color: GOLD })] });
const h3 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_3, bidirectional: true, spacing: { before: 160, after: 80 }, children: [run(text, { bold: true, size: 23 })] });
const bullet = (text: string) => new Paragraph({ bidirectional: true, numbering: { reference: "dd-bullets", level: 0 }, spacing: { after: 60 }, children: runs(text) });
const muted = (text: string) => para(text, { color: MUTED, size: 19, italics: true });

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: "E6DCC8" };
function table(head: string[] | null, rows: (string | number | null | undefined)[][], widths?: number[]) {
  const n = head?.length ?? rows[0]?.length ?? 1;
  const w = widths ?? Array.from({ length: n }, () => Math.floor(100 / n));
  const mk = (cells: (string | number | null | undefined)[], isHead: boolean) =>
    new TableRow({
      tableHeader: isHead,
      cantSplit: true,
      children: cells.map((c, i) =>
        new TableCell({
          width: { size: w[i] ?? w[0], type: WidthType.PERCENTAGE },
          shading: isHead ? { type: ShadingType.CLEAR, color: "auto", fill: "F3EAD7" } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
          children: String(c ?? "").split("\n").map((line) => new Paragraph({ bidirectional: true, children: runs(line, { bold: isHead, size: 19, color: isHead ? GOLD : INK }) })),
        })
      ),
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    visuallyRightToLeft: true,
    rows: [...(head ? [mk(head, true)] : []), ...rows.map((r) => mk(r, false))],
  });
}
const kv = (pairs: [string, string | number | null | undefined][]) => table(null, pairs.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, v]), [32, 68]);
const gap = () => new Paragraph({ children: [], spacing: { after: 120 } });

/** A light markdown → docx converter for saved deliverables (headings, bullets, tables, bold). */
function markdown(md: string): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  const lines = String(md ?? "").replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trimEnd();
    if (!l.trim()) continue;
    if (/^\s*\|.*\|\s*$/.test(l)) {
      const block: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) block.push(lines[i++]);
      i--;
      const rows = block.filter((b) => !/^\s*\|[\s:|-]+\|\s*$/.test(b)).map((b) => b.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
      if (rows.length) out.push(table(rows[0], rows.slice(1)), gap());
      continue;
    }
    const hm = l.match(/^(#{1,4})\s+(.*)$/);
    if (hm) { out.push(hm[1].length <= 2 ? h3(hm[2].replace(/\*\*/g, "")) : para(hm[2], { bold: true })); continue; }
    const bm = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bm) { out.push(bullet(bm[1])); continue; }
    if (/^\s*(-{3,}|_{3,})\s*$/.test(l)) continue;
    out.push(para(l.replace(/^>\s?/, "")));
  }
  return out;
}

// ---------- labels ----------
const PROFILE_LABELS: Record<string, string> = {
  business_type: "תחום העסק", business_name: "שם העסק", years_active: "ותק", monthly_revenue: "מחזור חודשי", employees: "עובדים",
  main_channel: "ערוץ מרכזי", avg_deal_price: "מחיר ממוצע לעסקה", main_pain: "הכאב המרכזי", goal: "מטרה", city: "עיר",
};
const MODE_LABEL = (m: string) => TOOLS.find((t) => t.id === m)?.title ?? (m === "chat" ? "שאלה חופשית" : m);
const KIND_LABEL = (k: string) =>
  k === "social_scan" ? "סריקת רשתות" : k.startsWith("quiz_") ? "מבחן" : k === "chat" ? "תוצר משיחה" : TOOLS.find((t) => t.id === k)?.title ?? k;
const STATUS_LABEL: Record<string, string> = { trial: "חודש מתנה", paid: "מנוי בתשלום", expired: "הגישה הסתיימה" };
const LEAD_LABEL: Record<string, string> = { renewal: "חידוש / מנוי", nir: "פגישה עם ניר", advisor: "פגישת יועץ" };

const dt = (s: string | null | undefined, time = false) =>
  s ? new Date(s).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "";
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);
const noDash = (s: string) => s.replace(/\s[–—]\s/g, ", ").replace(/[–—]/g, "-");

// ---------- data ----------
type Msg = { conversation_id: string; role: string; content: string; created_at: string };

async function load(userId: string) {
  const s = db();
  const [u, xr, fin, del, tasks, convs, leads, orders, events, journeys, audit] = await Promise.all([
    s.from("users").select("*").eq("id", userId).maybeSingle(),
    s.from("xray_results").select("answers, scores, total, archetype, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    s.from("financials").select("period, data, updated_at").eq("user_id", userId).order("period", { ascending: false }).limit(36),
    s.from("deliverables").select("id, kind, title, content, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(80),
    s.from("tasks").select("text, priority, done, done_at, created_at").eq("user_id", userId).order("done").order("created_at", { ascending: false }).limit(300),
    s.from("conversations").select("id, title, mode, created_at, updated_at, summary").eq("user_id", userId).order("updated_at", { ascending: false }).limit(200),
    s.from("leads").select("meeting_type, preferred_time, note, summary, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    s.from("orders").select("tier, billing, kind, amount_net, amount_total, status, channel, created_at, paid_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    s.from("events").select("type, meta, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
    s.from("journey_sends").select("stage, sent_at, ok").eq("user_id", userId).limit(200),
    s.from("admin_audit").select("action, meta, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
  ]);
  const ids = (convs.data ?? []).map((c) => c.id);
  let messages: Msg[] = [];
  for (let i = 0; i < ids.length && messages.length < 4000; i += 40) {
    const { data } = await s.from("messages").select("conversation_id, role, content, created_at").in("conversation_id", ids.slice(i, i + 40)).order("created_at", { ascending: true }).limit(2000);
    messages = messages.concat((data ?? []) as Msg[]);
  }
  return {
    user: u.data as Record<string, unknown> | null,
    xrays: xr.data ?? [], fin: fin.data ?? [], deliverables: del.data ?? [], tasks: tasks.data ?? [], convs: convs.data ?? [],
    leads: leads.data ?? [], orders: orders.data ?? [], events: events.data ?? [], journeys: journeys.data ?? [], audit: audit.data ?? [], messages,
  };
}

/** One-paragraph brief for the meeting, from stored summaries + recent user messages. Falls back to no AI. */
async function aiBrief(input: string): Promise<string | null> {
  if (!input.trim() || !process.env.GEMINI_API_KEY) return null;
  try {
    if (await overBudget()) return null;
    const call = gemini().models.generateContent({
      model: FAST_MODEL,
      contents: [{ role: "user", parts: [{ text: `אתה מכין תדריך קצר לניר דובדבני (יועץ עסקי) לפני פגישה עם לקוח של הפלטפורמה. כתוב בעברית, ישיר וקצר, בלי מקפים ארוכים, עד 180 מילים, במבנה:\nהעסק:\nהמספרים שנאמרו:\nהכאב המרכזי:\nמה כבר נבנה בפלטפורמה:\nכסף (תמחור, משכורת לבעלים, תזרים):\nמה כדאי לפתוח בפגישה:\nאל תמציא עובדות. אם אין מידע, כתוב "לא נאמר".\n\n${input.slice(0, 14000)}` }] }],
      config: { maxOutputTokens: 700, ...LITE_THINKING },
    });
    const res = await Promise.race([call, new Promise<null>((r) => setTimeout(() => r(null), 20000))]);
    if (!res) return null;
    void recordSpend(FAST_MODEL, res.usageMetadata).catch(() => {});
    return noDash((res.text ?? "").trim()) || null;
  } catch (e) {
    console.error("dossier brief failed", (e as Error).message);
    return null;
  }
}

export type DossierData = Awaited<ReturnType<typeof load>>;

export async function buildDossier(userId: string, adminName: string): Promise<{ buffer: Buffer; filename: string } | null> {
  return renderDossier(await load(userId), adminName);
}

/** Renders loaded data to a .docx (kept separate from loading so it can be tested with sample data). */
export async function renderDossier(d: DossierData, adminName: string, opts: { ai?: boolean } = {}): Promise<{ buffer: Buffer; filename: string } | null> {
  const u = d.user;
  if (!u) return null;
  const profile = ((u.profile as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const access = accessOf(u as Parameters<typeof accessOf>[0]);
  const plan = planById(access.tier);
  const money = moneyFromProfile(profile);
  const name = String(u.full_name ?? "");
  const business = [profile.business_type, profile.business_name].filter(Boolean).join(" · ");
  const convTitle = new Map(d.convs.map((c) => [c.id, c.title || "שיחה"]));
  const userMsgs = d.messages.filter((m) => m.role === "user");
  const lastActive = d.convs[0]?.updated_at ?? (u.last_seen_at as string) ?? null;
  const xr = d.xrays[0] as { answers: Record<string, number>; scores: Scores; total: number; archetype: string; created_at: string } | undefined;

  // ---------- brief ----------
  const briefInput = [
    business && `עסק: ${business}`,
    Object.entries(profile).filter(([k]) => PROFILE_LABELS[k]).map(([k, v]) => `${PROFILE_LABELS[k]}: ${v}`).join("\n"),
    money && `בדיקת כסף: ${money.score}/100 (${money.levelLabel}), ציר חלש: ${dimLabel(money.weakest)}`,
    xr && `רנטגן עסקי: ${xr.total}/100`,
    d.deliverables.length && `תוצרים שמורים: ${d.deliverables.slice(0, 10).map((x) => x.title).join(", ")}`,
    ...d.convs.filter((c) => c.summary).slice(0, 12).map((c) => `סיכום שיחה "${c.title}": ${c.summary}`),
    "הודעות אחרונות של הלקוח:",
    ...userMsgs.slice(-40).map((m) => `- ${clip(m.content, 400)}`),
  ].filter(Boolean).join("\n");
  const brief = opts.ai === false ? null : await aiBrief(briefInput);

  const children: (Paragraph | Table)[] = [];

  // ---------- cover ----------
  children.push(
    new Paragraph({ spacing: { before: 2200, after: 200 }, alignment: AlignmentType.CENTER, bidirectional: true, children: [run("DUVDEVANI PLATFORM", { size: 20, color: GOLD, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 160 }, children: [run("התיק העסקי", { size: 72, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 120 }, children: [run(name, { size: 40, bold: true, color: GOLD })] }),
    para(business || "תחום העסק לא נאמר עדיין", { align: "center", size: 26, color: MUTED }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 80 }, bidirectional: true, children: [run(`${STATUS_LABEL[access.status]}${plan ? ` · ${plan.name}` : ""} · עד ${dt(access.accessUntil)}`, { size: 22 })] }),
    para(`הופק ב-${dt(new Date().toISOString(), true)} על ידי ${adminName}`, { align: "center", size: 20, color: MUTED }),
    para("מסמך פנימי לצוות. מכיל מידע אישי של הלקוח, לא להעביר הלאה.", { align: "center", size: 18, color: MUTED, italics: true }),
  );

  // ---------- contents ----------
  const SECTIONS = [
    "תקציר לפני הפגישה", "פרטים אישיים ועסקיים", "מנוי ותשלומים", "כסף: בדיקת הכסף והסדנה", "רנטגן עסקי",
    "המספרים: נתונים כספיים", "תוכניות, כלים ותוצרים שמורים", "משימות", "מסע הלקוח ווובינר", "פניות ופגישות", "היסטוריית שיחות עם הבוט", "הערות פנימיות",
  ];
  children.push(new Paragraph({ children: [new PageBreak()] }), h2("תוכן העניינים"));
  SECTIONS.forEach((t, i) => children.push(para(`${i + 1}. ${t}`, { size: 23, after: 80 })));

  // 1 ---------- brief ----------
  children.push(h1(`1. ${SECTIONS[0]}`));
  children.push(kv([
    ["סטטוס", `${STATUS_LABEL[access.status]}${plan ? ` · ${plan.name}` : ""}`],
    ["גישה עד", `${dt(access.accessUntil)} (${access.daysLeft} ימים)`],
    ["נרשם", dt(u.created_at as string)],
    ["פעיל לאחרונה", dt(lastActive, true)],
    ["ציון כסף", money ? `${money.score}/100 · ${money.levelLabel} · הכי חלש: ${dimLabel(money.weakest)}` : "לא עשה את בדיקת הכסף"],
    ["רנטגן עסקי", xr ? `${xr.total}/100 · ${ARCHETYPES.find((a) => a.id === xr.archetype)?.name ?? ""}` : "לא עשה רנטגן"],
    ["שיחות עם הבוט", `${d.convs.length} שיחות · ${userMsgs.length} הודעות של הלקוח`],
    ["תוצרים שמורים", d.deliverables.length],
    ["משימות", `${d.tasks.filter((t) => t.done).length} בוצעו מתוך ${d.tasks.length}`],
    ["פניות לפגישה", d.leads.length],
  ]));
  children.push(h2("תדריך"));
  if (brief) brief.split("\n").filter((l) => l.trim()).forEach((l) => children.push(para(l)));
  else if (d.convs.some((c) => c.summary)) d.convs.filter((c) => c.summary).slice(0, 6).forEach((c) => { children.push(h3(c.title || "שיחה"), para(noDash(String(c.summary)))); });
  else children.push(muted("אין עדיין מספיק שיחות לתדריך."));
  if (brief) children.push(muted("התדריך נכתב אוטומטית מתוך השיחות. לבדוק מול התמליל המלא בסעיף 11."));

  // 2 ---------- personal + business ----------
  children.push(h1(`2. ${SECTIONS[1]}`));
  const utm = (u.utm ?? {}) as Record<string, string>;
  children.push(kv([
    ["שם מלא", name], ["טלפון", String(u.phone ?? "")], ["מייל", String(u.email ?? "")],
    ["תאריך הרשמה", dt(u.created_at as string, true)], ["הסכמה לדיוור", u.marketing_consent ? `כן (${dt(u.marketing_consent_at as string)})` : "לא"],
    ["הסרה מדיוור", u.unsubscribed_at ? dt(u.unsubscribed_at as string) : ""],
    ["מקור הגעה", Object.entries(utm).map(([k, v]) => `${k}: ${v}`).join(" · ")],
  ]));
  children.push(h2("מה הבוט למד על העסק (שאלון ההיכרות והשיחות)"));
  const prof = Object.entries(profile).filter(([k]) => PROFILE_LABELS[k]);
  if (prof.length) children.push(kv(prof.map(([k, v]) => [PROFILE_LABELS[k], String(v)])));
  else children.push(muted("הלקוח עוד לא סיפר על העסק."));
  const extra = Object.entries(profile).filter(([k]) => !PROFILE_LABELS[k] && !["money", "money_history"].includes(k) && (typeof profile[k] === "string" || typeof profile[k] === "number"));
  if (extra.length) children.push(gap(), kv(extra.map(([k, v]) => [k, String(v)])));

  // 3 ---------- subscription ----------
  children.push(h1(`3. ${SECTIONS[2]}`));
  children.push(kv([
    ["סטטוס", STATUS_LABEL[access.status]], ["מסלול", plan?.name ?? "אין מסלול בתשלום"], ["אופן תשלום", u.billing === "installments" ? "12 תשלומים" : u.billing === "onetime" ? "תשלום אחד" : ""],
    ["גישה עד", dt(access.accessUntil)], ["שולם בתאריך", dt(u.paid_at as string)], ["סומן ע״י", String(u.paid_by ?? "")],
    ["חידוש", String(u.renewal_mode ?? "")], ["ביקש להמשיך", dt(u.renewal_requested_at as string)], ["סוף השנה", dt(u.year_ends_at as string)],
  ]));
  if (d.orders.length) {
    children.push(h2("הזמנות"));
    children.push(table(["תאריך", "מסלול", "סוג", "סכום (לא כולל מע״מ)", "סטטוס", "ערוץ"], d.orders.map((o) => [dt(o.created_at), planById(o.tier)?.name ?? o.tier, o.kind ?? (o.billing === "installments" ? "12 תשלומים" : "תשלום אחד"), o.amount_net != null ? ils(Number(o.amount_net), 2) : "", o.status, o.channel ?? ""])));
  }

  // 4 ---------- money ----------
  children.push(h1(`4. ${SECTIONS[3]}`));
  if (money) {
    children.push(kv([["ציון כסף", `${money.score}/100`], ["רמה", money.levelLabel], ["הציר הכי חלש", dimLabel(money.weakest)], ["תאריך הבדיקה", dt(money.at, true)]]));
    children.push(h2("לפי צירים"), table(["ציר", "ציון"], MONEY_DIMS.map((x) => [x.label, `${money.dims[x.id] ?? 0}/100`]), [70, 30]));
    children.push(h2("התשובות"), table(["שאלה", "תשובה"], MONEY_QUESTIONS.map((q) => [q.q, q.options[money.answers?.[q.id] ?? -1] ?? ""]), [55, 45]));
    const hist = Array.isArray(profile.money_history) ? (profile.money_history as { score: number; at: string }[]) : [];
    if (hist.length) children.push(h2("בדיקות קודמות"), table(["תאריך", "ציון"], hist.map((h) => [dt(h.at), h.score])));
  } else children.push(muted("הלקוח עוד לא עשה את בדיקת הכסף (עמוד \"כסף\" בפלטפורמה)."));
  children.push(h2(`הסדנה "${WORKSHOP.name}"`), para(`${WORKSHOP.subtitle} · ${WORKSHOP.cadence}, ${WORKSHOP.perYear} מפגשים בשנה של ${WORKSHOP.hours} שעות. ${access.status === "paid" ? "הלקוח זכאי לסדנה במסגרת המנוי." : "הסדנה נפתחת עם מנוי בתשלום."}`));

  // 5 ---------- x-ray ----------
  children.push(h1(`5. ${SECTIONS[4]}`));
  if (xr) {
    children.push(kv([["ציון כולל", `${xr.total}/100`], ["פרופיל", ARCHETYPES.find((a) => a.id === xr.archetype)?.name ?? xr.archetype], ["תאריך", dt(xr.created_at, true)]]));
    children.push(h2("לפי תחומים"), table(["תחום", "ציון"], AXES.map((a) => [a.label, `${xr.scores?.[a.id] ?? 0}/100`]), [70, 30]));
    children.push(h2("התשובות"), table(["שאלה", "תשובה"], QUESTIONS.map((q) => [q.q, q.options[xr.answers?.[q.id] ?? -1] ?? "לא ענה"]), [55, 45]));
    if (d.xrays.length > 1) children.push(h2("רנטגנים קודמים"), table(["תאריך", "ציון"], d.xrays.slice(1).map((x) => [dt(x.created_at), x.total])));
  } else children.push(muted("הלקוח עוד לא עשה רנטגן עסקי."));

  // 6 ---------- numbers ----------
  children.push(h1(`6. ${SECTIONS[5]}`));
  if (d.fin.length) {
    const periods = d.fin.slice(0, 12);
    children.push(table(["שדה", ...periods.map((p) => p.period)], FIN_FIELDS.map((f) => [f.label, ...periods.map((p) => { const v = (p.data as FinData)[f.key]; return v != null ? ils(v) : ""; })])));
    children.push(h2("חישובים"));
    children.push(table(["חודש", "רווח גולמי", "רווח תפעולי", "רווח נקי", "שיווק מהמחזור", "שכר מהמחזור"], periods.map((p) => { const c = calc(p.data as FinData); return [p.period, `${ils(c.gross)} (${c.grossPct}%)`, `${ils(c.operating)} (${c.operatingPct}%)`, `${ils(c.net)} (${c.netPct}%)`, `${c.marketingPct}%`, `${c.salariesPct}%`]; })));
    children.push(muted("המספרים כפי שהלקוח הזין בפלטפורמה, בלי בדיקה חשבונאית."));
  } else children.push(muted("הלקוח לא הזין נתונים כספיים."));

  // 7 ---------- deliverables ----------
  children.push(h1(`7. ${SECTIONS[6]}`));
  if (d.deliverables.length) {
    children.push(table(["תאריך", "סוג", "כותרת"], d.deliverables.map((x) => [dt(x.created_at), KIND_LABEL(x.kind), x.title]), [18, 22, 60]));
    for (const x of d.deliverables.slice(0, 40)) {
      children.push(h2(x.title), muted(`${KIND_LABEL(x.kind)} · ${dt(x.created_at, true)}`), ...markdown(clip(String(x.content ?? ""), 20000)));
    }
  } else children.push(muted("אין תוצרים שמורים."));
  const tools = new Map<string, number>();
  for (const c of d.convs) tools.set(c.mode, (tools.get(c.mode) ?? 0) + 1);
  if (tools.size) children.push(h2("שימוש בכלים"), table(["כלי", "שיחות"], [...tools.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => [MODE_LABEL(m), n]), [70, 30]));

  // 8 ---------- tasks ----------
  children.push(h1(`8. ${SECTIONS[7]}`));
  if (d.tasks.length) children.push(table(["משימה", "עדיפות", "סטטוס"], d.tasks.map((t) => [t.text, t.priority === "urgent" ? "דחוף" : "חשוב", t.done ? `בוצע ${dt(t.done_at)}` : "פתוח"]), [64, 14, 22]));
  else children.push(muted("אין משימות."));

  // 9 ---------- journey + webinar ----------
  children.push(h1(`9. ${SECTIONS[8]}`));
  children.push(kv([["הוובינר הבא", `${WEBINAR_TITLE} · יום ראשון ${webinarLabel(nextWebinar())} ב-${WEBINAR_TIME}`]]));
  const webinarEvents = d.events.filter((e) => /webinar/i.test(e.type));
  if (webinarEvents.length) children.push(h2("פעולות סביב הוובינר"), table(["תאריך", "פעולה"], webinarEvents.slice(0, 40).map((e) => [dt(e.created_at, true), e.type])));
  if (d.journeys.length) {
    const sorted = [...d.journeys].sort((a, b) => String(a.sent_at).localeCompare(String(b.sent_at)));
    children.push(h2("הודעות שנשלחו במסע"), table(["תאריך", "שלב", "נושא", "נשלח"], sorted.map((j) => { const st = STAGES.find((x) => x.key === String(j.stage).split(":")[0]); return [dt(j.sent_at, true), st?.track ?? j.stage, st?.subject ?? j.stage, j.ok === false ? "נכשל" : "כן"]; }), [18, 14, 54, 14]));
  } else children.push(muted("עוד לא נשלחו הודעות מסע."));
  const counts = new Map<string, number>();
  for (const e of d.events) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  if (counts.size) children.push(h2("פעילות בפלטפורמה"), table(["אירוע", "כמה פעמים"], [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30), [70, 30]));

  // 10 ---------- leads ----------
  children.push(h1(`10. ${SECTIONS[9]}`));
  if (d.leads.length) {
    for (const l of d.leads) {
      children.push(h3(`${LEAD_LABEL[l.meeting_type] ?? l.meeting_type} · ${dt(l.created_at, true)}`));
      children.push(kv([["סטטוס", l.status], ["מתי נוח", l.preferred_time], ["הערה", l.note]]));
      if (l.summary) children.push(...markdown(noDash(String(l.summary))));
    }
  } else children.push(muted("אין פניות לפגישה."));

  // 11 ---------- conversations ----------
  children.push(h1(`11. ${SECTIONS[10]}`));
  if (d.convs.length) {
    children.push(h2("סיכום לפי שיחה"));
    children.push(table(["תאריך", "שיחה", "כלי", "הודעות", "סיכום"], d.convs.map((c) => [dt(c.updated_at), c.title || "שיחה", MODE_LABEL(c.mode), d.messages.filter((m) => m.conversation_id === c.id).length, c.summary ? clip(noDash(String(c.summary)), 600) : ""]), [12, 22, 14, 10, 42]));
    children.push(h2("תמליל מלא"));
    const byConv = new Map<string, Msg[]>();
    for (const m of d.messages) (byConv.get(m.conversation_id) ?? byConv.set(m.conversation_id, []).get(m.conversation_id)!).push(m);
    for (const c of [...d.convs].reverse()) {
      const ms = byConv.get(c.id) ?? [];
      if (!ms.length) continue;
      children.push(h3(`${convTitle.get(c.id)} · ${dt(c.created_at)}`));
      for (const m of ms) {
        const who = m.role === "user" ? name.split(" ")[0] || "הלקוח" : "דובדבוט";
        children.push(new Paragraph({ bidirectional: true, spacing: { before: 120, after: 40 }, children: [run(`${who} · ${dt(m.created_at, true)}`, { bold: true, size: 19, color: m.role === "user" ? INK : GOLD })] }));
        children.push(...markdown(clip(m.content, 6000)));
      }
    }
    if (d.messages.length >= 4000) children.push(muted("התמליל קוצר ל-4,000 ההודעות הראשונות."));
  } else children.push(muted("עוד לא היו שיחות עם הבוט."));

  // 12 ---------- internal ----------
  children.push(h1(`12. ${SECTIONS[11]}`));
  children.push(kv([["הערה פנימית", String(u.admin_note ?? "") || "אין"]]));
  if (d.audit.length) children.push(h2("פעולות צוות"), table(["תאריך", "פעולה"], d.audit.map((a) => [dt(a.created_at, true), a.action])));

  const doc = new Document({
    creator: "Duvdevani Platform",
    title: `התיק העסקי · ${name}`,
    styles: { default: { document: { run: { font: FONT, size: 21, rightToLeft: true } } } },
    numbering: { config: [{ reference: "dd-bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.START, style: { paragraph: { indent: { start: 360, hanging: 260 } } } }] }] },
    sections: [{
      properties: { page: { margin: { top: 1100, bottom: 1100, left: 1100, right: 1100 } } },
      headers: { default: new Header({ children: [new Paragraph({ bidirectional: true, children: [run(`התיק העסקי · ${name} · Duvdevani Platform`, { size: 16, color: MUTED })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED, font: FONT })] })] }) },
      children,
    }],
  });
  const buffer = await Packer.toBuffer(doc);
  const safe = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().replace(/\s+/g, "-") || "client";
  return { buffer, filename: `התיק-העסקי-${safe}-${new Date().toISOString().slice(0, 10)}.docx` };
}
