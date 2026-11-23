import { createHmac } from "crypto";
import { db } from "./supabase";
import { contactOf } from "./automation";
import { alert } from "./alerts";
import { noAstral } from "./journeys";
import { nextSendable, render2, stage2 } from "./journeys2";
import { TOOLS } from "./persona";

/**
 * Sends one DP2 journey stage (WhatsApp flow + optional email) through the Make scenario
 * "Duvdevani Platform – DP2 Journeys" (DP2_WEBHOOK_URL). Every send is claimed in journey_sends under a
 * unique stage key first, so retries never double-send. Off unless DP2_ENABLED=1.
 */
export const dp2On = () => (process.env.DP2_ENABLED === "1" || process.env.DP2_ENABLED === "test") && !!process.env.DP2_WEBHOOK_URL;
/** DP2_ENABLED=1: everyone. DP2_ENABLED=test: only the phones in DP2_TEST_PHONES (comma separated), the old journey keeps running. */
export const dp2Live = () => process.env.DP2_ENABLED === "1" && !!process.env.DP2_WEBHOOK_URL;
const testPhones = () => (process.env.DP2_TEST_PHONES ?? "").split(",").map((p) => p.replace(/\D/g, "").replace(/^972/, "0")).filter(Boolean);
const app = () => process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app";

export function meetingWhen(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", weekday: "long" });
  const date = d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric" });
  const time = d.toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" });
  return `${day}, ${date} בשעה ${time}`;
}

/** "12 שיחות עם הבוט, רנטגן עסקי, תיק עסקי עם המספרים שלך" built from real usage. */
export async function builtSummary(userId: string) {
  const supabase = db();
  const [{ count: convs }, { count: xr }, { count: fin }, { count: dl }] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("xray_results").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("financials").select("user_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("deliverables").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const parts: string[] = [];
  if (convs) parts.push(convs === 1 ? "שיחה אחת עם הבוט" : `${convs} שיחות עם הבוט`);
  if (dl) parts.push(dl === 1 ? "תכנית עבודה אחת" : `${dl} תכניות ומסמכים`);
  if (xr) parts.push("רנטגן עסקי");
  if (fin) parts.push("תיק עסקי עם המספרים שלך");
  return parts.length ? parts.join(", ") : "חשבון מוכן עם כל הכלים";
}

export async function topTool(userId: string) {
  const { data } = await db().from("conversations").select("mode").eq("user_id", userId).limit(200);
  const count = new Map<string, number>();
  for (const c of data ?? []) count.set(c.mode, (count.get(c.mode) ?? 0) + 1);
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "chat";
  return top === "chat" ? "שיחות עם הבוט" : TOOLS.find((t) => t.id === top)?.title ?? "שיחות עם הבוט";
}

/** The rep's note as one sentence that ends with "." (the WhatsApp template has no line break after it). */
function nextStep(raw?: string) {
  const t = String(raw ?? "").split("\n")[0].trim().replace(/[.\s]+$/, "").slice(0, 200);
  return t ? `${t}.` : "לבחור דבר אחד מהתכנית ולהתחיל לבצע.";
}

/**
 * Rav Messer list "Duvdevani Platform – מסע DP3": the template has 8 paragraph fields (dp_b1..dp_b8, 255 chars each)
 * and a "להצטרפות עכשיו" button. One paragraph per field so lines never run together; a bare URL line joins the
 * line before it; the signature is in the template footer. No emojis (Rav Messer cuts the text at them).
 */
export function emailLines(text: string, slots = 8, max = 255): string[] {
  const lines: string[] = [];
  for (const raw of noAstral(text).split("\n")) {
    const l = raw.trim();
    if (!l || l === "ניר דובדבני") continue;
    if (/^https?:\/\/\S+$/.test(l) && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1]} ${l}`;
    else lines.push(l);
  }
  // too many paragraphs: fold the tail into the last slot
  while (lines.length > slots) lines.splice(slots - 1, 2, `${lines[slots - 1]} ${lines[slots]}`);
  const out = lines.map((l) => {
    if (l.length <= max) return l;
    const cut = l.slice(0, max);
    return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20));
  });
  while (out.length < slots) out.push("");
  return out;
}

type Extra = { meeting_when?: string; rep_name?: string; next_step?: string };

/**
 * Send `key` to the user now. `claim` is the unique journey_sends key (defaults to dp2:<key>).
 * Customer messages never go out in quiet hours or on Shabbat: they are queued to the next allowed time
 * (meeting confirmations are the exception and go right away, as the spec says).
 */
export async function sendDp2(userId: string, key: string, opts: { claim?: string; extra?: Extra; allowQuiet?: boolean } = {}) {
  if (!dp2On()) return { sent: false, reason: "off" };
  const st = stage2(key);
  if (!st) return { sent: false, reason: "no stage" };
  const supabase = db();
  const claim = opts.claim ?? `dp2:${key}`;
  if (!opts.allowQuiet) {
    const at = nextSendable();
    if (at > Date.now() + 60_000) {
      await supabase.from("dp2_queue").upsert({ user_id: userId, stage: key, claim, extra: opts.extra ?? {}, send_after: new Date(at).toISOString() }, { onConflict: "user_id,claim", ignoreDuplicates: true });
      return { sent: false, reason: "queued" };
    }
  }
  const { error } = await supabase.from("journey_sends").insert({ user_id: userId, stage: claim });
  if (error) return { sent: false, reason: "already sent" };

  const contact = await contactOf(userId);
  if (!contact) return { sent: false, reason: "no user" };
  if (!dp2Live() && !testPhones().includes(contact.phone)) {
    await supabase.from("journey_sends").delete().eq("user_id", userId).eq("stage", claim);
    return { sent: false, reason: "test mode" };
  }
  const { data: u } = await supabase.from("users").select("marketing_consent, marketing_opt_out").eq("id", userId).maybeSingle();
  // Israeli anti-spam law: marketing only with consent and no opt-out; service messages go to everyone
  if (st.kind === "marketing" && (!u?.marketing_consent || u?.marketing_opt_out)) {
    await supabase.from("journey_sends").update({ ok: false }).eq("user_id", userId).eq("stage", claim);
    return { sent: false, reason: "no consent" };
  }
  const vars: Record<string, string> = {
    first_name: contact.first_name,
    app_url: app(),
    plans_url: `${app()}/plans`,
    meeting_when: opts.extra?.meeting_when ?? "",
    rep_name: opts.extra?.rep_name ?? "הצוות שלנו",
    next_step: nextStep(opts.extra?.next_step),
    built_summary: key === "d14" || key === "d21" ? await builtSummary(userId) : "",
    top_tool: key === "d7_active" ? await topTool(userId) : "",
  };
  const emailText = st.email ? noAstral(render2(st.email, vars)) : "";
  const body = JSON.stringify({
    event: "journey",
    at: new Date().toISOString(),
    app: app(),
    contact,
    data: {
      stage: claim,
      track: "dp2",
      whatsapp_template: st.wa ?? "",
      email: !!st.email && !!contact.email,
      email_subject: noAstral(render2(st.subject, vars)),
      text: emailText,
      email_parts: emailLines(emailText),
      vars,
      transactional: st.kind === "service",
    },
  });
  try { await supabase.from("events").insert({ user_id: userId, type: `auto:dp2:${key}`, meta: { claim } }); } catch {}
  const secret = process.env.AUTOMATION_SECRET || process.env.SESSION_SECRET || "";
  try {
    const r = await fetch(process.env.DP2_WEBHOOK_URL!, { method: "POST", headers: { "Content-Type": "application/json", "X-Signature": createHmac("sha256", secret).update(body).digest("hex") }, body, signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      await supabase.from("journey_sends").update({ ok: false }).eq("user_id", userId).eq("stage", claim);
      await alert("dp2_http", "Make לא מקבל הודעות DP2", [`שלב: ${key}`, `סטטוס: ${r.status}`], 60);
    }
    return { sent: r.ok };
  } catch (e) {
    await supabase.from("journey_sends").update({ ok: false }).eq("user_id", userId).eq("stage", claim);
    await alert("dp2_down", "Make לא זמין (DP2)", [`שלב: ${key}`, (e as Error).message], 60);
    return { sent: false, reason: "network" };
  }
}

/** Lead status changes in the back-office CRM → the matching customer message. Never throws. */
export async function onLeadChange(p: { userId: string | null; leadId: string; status?: string; prevStatus?: string | null; meetingAt?: string | null; repName?: string | null; note?: string }) {
  if (!dp2On() || !p.userId) return;
  try {
    if (p.meetingAt && p.status === "scheduled") {
      await sendDp2(p.userId, "meeting_set", { claim: `dp2:meeting_set:${p.leadId}:${p.meetingAt}`, extra: { meeting_when: meetingWhen(p.meetingAt), rep_name: p.repName ?? undefined }, allowQuiet: true });
    } else if (p.status === "no_answer" && p.prevStatus !== "no_answer") {
      // once per day at most
      await sendDp2(p.userId, "no_answer", { claim: `dp2:no_answer:${p.leadId}:${new Date().toISOString().slice(0, 10)}` });
    } else if (p.status === "no_show") {
      await sendDp2(p.userId, "no_show", { claim: `dp2:no_show:${p.leadId}:${new Date().toISOString().slice(0, 10)}` });
    } else if (p.status === "met" && p.prevStatus !== "met") {
      // an hour after the meeting, with the rep's next step
      await db().from("dp2_queue").upsert({ user_id: p.userId, stage: "after_meeting", claim: `dp2:after_meeting:${p.leadId}`, extra: { rep_name: p.repName ?? "", next_step: p.note ?? "" }, send_after: new Date(nextSendable(Date.now() + 3600_000)).toISOString() }, { onConflict: "user_id,claim", ignoreDuplicates: true });
    }
  } catch (e) {
    console.error("dp2 lead change", e);
  }
}
