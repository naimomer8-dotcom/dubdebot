import { DISC_STYLES, SALES_AXES, SALES_TIPS, scoreDisc, scoreSales, type Disc } from "./quizzes";

/** Markdown summary of a test result (saved to the vault and used to brief the chat). */
export function discReport(answers: Record<string, string>) {
  const r = scoreDisc(answers);
  const m = DISC_STYLES[r.main as Disc];
  const s = DISC_STYLES[r.second as Disc];
  const md = `## סגנון התקשורת שלך: ${m.name}
${m.line}

| סגנון | אחוז |
|---|---|
${(Object.keys(DISC_STYLES) as Disc[]).map((k) => `| ${DISC_STYLES[k].name} | ${r.pct[k]}% |`).join("\n")}

**החוזקות שלך:** ${m.strengths.join(" · ")}

**איפה זה עולה לך כסף:** ${m.risks.join(" · ")}

**הסגנון המשני:** ${s.name} – ${s.line}

### איך למכור לכל סוג לקוח
${(Object.keys(DISC_STYLES) as Disc[]).map((k) => `- **${DISC_STYLES[k].name}:** ${DISC_STYLES[k].sellTo}`).join("\n")}`;
  return { title: `מבחן תקשורת: ${m.name}`, md, summary: `${m.name} (${r.pct[r.main as Disc]}%), משני ${s.name}` };
}

export function salesReport(answers: Record<string, number>) {
  const r = scoreSales(answers);
  const md = `## כושר מכירות: ${r.total}/100
החוזקה שלך: **${r.strongest.label}**. צוואר הבקבוק: **${r.weakest.label}**.

| ציר | ציון |
|---|---|
${SALES_AXES.map((a) => `| ${a.label} | ${r.scores[a.id]} |`).join("\n")}

### מה לתקן קודם
${[...SALES_AXES].sort((a, b) => r.scores[a.id] - r.scores[b.id]).slice(0, 3).map((a) => `- **${a.label}:** ${SALES_TIPS[a.id]}`).join("\n")}`;
  return { title: `מבחן מכירות: ${r.total}/100`, md, summary: `ציון ${r.total}, חלש ב${r.weakest.label}, חזק ב${r.strongest.label}` };
}
