"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "./Icon";
import { TIER_RANK, type Tier } from "@/lib/plans";

/** Contextual upsell under a finished deliverable: offers the plan that turns this answer into execution. */
const RULES: Record<string, { need: Tier; title: string; text: string }> = {
  workplan: { need: "private", title: "תוכנית בלי הטמעה נשארת במגירה", text: "ב-Alpha Private יועץ עסקי בכיר יושב איתך 3 שעות ומטמיע את התוכנית הזאת בעסק שלך." },
  feasibility: { need: "upgrade", title: "רוצה שניר יעבור על זה איתך?", text: "ב-Alpha Upgrade יש פגישה אישית עם ניר דובדבני על ההחלטה הגדולה הזאת." },
  forecast: { need: "private", title: "תחזית היא התחלה. עכשיו ביצוע", text: "ב-Alpha Private יועץ בכיר בונה איתך את הצעדים שמביאים למספרים האלה." },
  sales_script: { need: "basic", title: "התסריט הזה, ועוד קורס שלם", text: "ב-Alpha Basic נפתחים לך \"פשוט למכור יותר\" ו\"שפת גוף של כוכב מכירות\", וזום עם ניר פעם בשבועיים." },
  campaign: { need: "basic", title: "רוצה ללמוד לבנות את זה לבד?", text: "ב-Alpha Basic יש את כל הקורסים של ניר, כולל \"מקצוען ב-AI\" ו\"איך לבנות קורס דיגיטלי\"." },
  financials: { need: "basic", title: "המספרים האלה מקבלים קורס שלם", text: "ב-Alpha Basic נפתח לך \"מקצוען בכספים\", וזום עם ניר פעם בשבועיים לשאלות." },
  payslip: { need: "basic", title: "רוצה להבין את הכסף לעומק?", text: "ב-Alpha Basic נפתח לך הקורס \"מקצוען בכספים\" ועוד 8 קורסים." },
};

export default function UpsellInline({ mode, tier, onShown }: { mode: string; tier: Tier | null; onShown?: () => void }) {
  const [hide, setHide] = useState(false);
  const r = RULES[mode];
  if (!r || hide) return null;
  if (tier && TIER_RANK[tier] >= TIER_RANK[r.need]) return null;
  onShown?.();
  return (
    <div className="upsell-inline" role="note">
      <span className="ui-ico" aria-hidden="true"><Icon name="gem" size={18} /></span>
      <div>
        <b>{r.title}</b>
        <p>{r.text}</p>
      </div>
      <Link className="btn btn-primary btn-sm" href={`/plans?up=${r.need}`}>לפרטים</Link>
      <button className="icon-btn" onClick={() => setHide(true)} aria-label="הסתרה"><Icon name="close" size={14} /></button>
    </div>
  );
}
