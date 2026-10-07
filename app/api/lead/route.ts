import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { gemini, CHAT_MODEL, FAST_THINKING } from "@/lib/gemini";
import { LEAD_SUMMARY_PROMPT } from "@/lib/persona";
import { cleanName, isEmail, normalizeIsraeliPhone } from "@/lib/validation";
import { sendToMake } from "@/lib/make";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const meetingType = body.meetingType === "nir" ? "nir" : "advisor";
  const fullName = cleanName(String(body.fullName ?? ""));
  const phone = normalizeIsraeliPhone(String(body.phone ?? ""));
  const email = String(body.email ?? "").trim().toLowerCase();
  const preferredTime = String(body.preferredTime ?? "").slice(0, 60);
  const note = String(body.note ?? "").slice(0, 1000);
  const conversationId: string | null = body.conversationId ?? null;

  const errors: Record<string, string> = {};
  if (fullName.length < 2) errors.fullName = "צריך שם";
  if (!phone) errors.phone = "צריך נייד תקין";
  if (email && !isEmail(email)) errors.email = "המייל לא תקין";
  if (Object.keys(errors).length || !phone) return NextResponse.json({ errors }, { status: 422 });

  const supabase = db();
  const { data: user } = await supabase.from("users").select("id, email, profile, utm").eq("id", userId).single();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // conversation must belong to the user
  let transcript = "";
  let validConversation: string | null = null;
  if (conversationId) {
    const { data: conv } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("user_id", userId).maybeSingle();
    if (conv) {
      validConversation = conv.id;
      const { data: msgs } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true })
        .limit(40);
      transcript = (msgs ?? [])
        .map((m) => `${m.role === "user" ? "בעל העסק" : "דובדבוט"}: ${m.content.slice(0, 1200)}`)
        .join("\n");
    }
  }

  let summary = "";
  if (transcript) {
    try {
      const res = await gemini().models.generateContent({
        model: CHAT_MODEL,
        contents: [{ role: "user", parts: [{ text: `${LEAD_SUMMARY_PROMPT}\n\nפרופיל: ${JSON.stringify(user.profile ?? {})}\n\nהשיחה:\n${transcript}` }] }],
        config: { maxOutputTokens: 2000, ...FAST_THINKING },
      });
      summary = res.text?.trim() ?? "";
    } catch (e) {
      console.error("summary failed", e);
    }
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      user_id: userId,
      conversation_id: validConversation,
      meeting_type: meetingType,
      full_name: fullName,
      phone,
      email: email || user.email,
      preferred_time: preferredTime || null,
      note: note || null,
      summary: summary || null,
      trigger: body.trigger ? String(body.trigger).slice(0, 40) : null,
    })
    .select("id, created_at")
    .single();
  if (error || !lead) {
    console.error(error);
    return NextResponse.json({ error: "משהו השתבש. נסה שוב." }, { status: 500 });
  }

  await Promise.all([
    validConversation
      ? supabase.from("conversations").update({ lead_submitted: true }).eq("id", validConversation)
      : Promise.resolve(),
    supabase.from("events").insert({ user_id: userId, conversation_id: validConversation, type: "lead_submitted", meta: { meetingType } }),
  ]);

  // → Make: Google Sheets row + team email + Fireberry lead
  await sendToMake(process.env.MAKE_LEAD_WEBHOOK_URL, {
    type: "meeting_request",
    lead_id: lead.id,
    created_at: lead.created_at,
    meeting_type: meetingType === "nir" ? "פגישה עם ניר דובדבני" : "פגישת אסטרטגיה עם יועץ",
    full_name: fullName,
    phone,
    phone_intl: "+972" + phone.slice(1),
    email: email || user.email,
    preferred_time: preferredTime,
    note,
    business_profile: user.profile ?? {},
    ai_summary: summary,
    trigger: body.trigger ?? null,
    utm: user.utm ?? {},
    source: "דובדבוט",
  });

  return NextResponse.json({ ok: true });
}
