import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCheckup } from "@/lib/checkupData";
import { QUESTIONS, STATIONS, answerScore, grade, type Profile, type Report, type Scores } from "@/lib/checkup";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "תוכנית עסקית 2027 | ניר דובדבני", robots: { index: false } };

const col = (s: number) => (s >= 8 ? "#2f9e6e" : s >= 6 ? "#b08a3e" : s >= 4 ? "#d07a2e" : "#c8102e");

export default async function CheckupPrint({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await loadCheckup(token);
  if (!d) notFound();
  const report = d.report as Report;
  const scores = d.scores as Scores;
  const total = Number(d.total);
  const profile = (d.profile ?? {}) as Profile;
  const answers = (d.answers ?? {}) as Record<string, number>;
  const g = grade(total);
  const date = new Date(d.finished_at as string).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="pp">
      <PrintButton />
      {/* cover */}
      <section className="pp-page pp-cover">
        <div className="pp-cover-top"><img src="/logo-duvdevani-white.png" alt="" /><span>{date}</span></div>
        <div className="pp-cover-mid">
          <p className="pp-eyebrow">תוכנית עסקית אישית</p>
          <h1>2027</h1>
          <h2>{profile.business || "העסק שלך"}{d.name ? ` · ${d.name}` : ""}</h2>
          <div className="pp-score"><b>{total.toFixed(1)}</b><span>/10</span><em style={{ color: col(total) }}>{g.word}</em></div>
          <p className="pp-headline">{report.headline}</p>
        </div>
        <div className="pp-cover-bot"><img src="/nir/home-suit.webp" alt="" /><div><b>ניר דובדבני</b><span>22 שנה של ליווי עסקים · הבית להצלחה בחיים ובעסקים</span></div></div>
      </section>

      {/* scorecard */}
      <section className="pp-page">
        <h3 className="pp-h">הצ׳קאפ: ציון לכל פרמטר</h3>
        <table className="pp-table">
          <thead><tr><th>תחנה</th><th>פרמטרים</th><th>ציון</th></tr></thead>
          <tbody>
            {STATIONS.map((s) => (
              <tr key={s.id}>
                <td><b>{s.n}. {s.label}</b></td>
                <td>{QUESTIONS.filter((q) => q.station === s.id).map((q) => `${q.param} ${answerScore(q, answers[q.id]) ?? "-"}`).join(" · ")}</td>
                <td><b style={{ color: col(scores[s.id]) }}>{scores[s.id]}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="pp-h">3 המהלכים שיזיזו לך את 2027</h3>
        <div className="pp-top3">
          {report.top3.map((m, i) => <div key={i}><span>{i + 1}</span><b>{m.title}</b><p>{m.why}</p><p className="act">← {m.action}</p></div>)}
        </div>
      </section>

      {/* feedback */}
      <section className="pp-page">
        <h3 className="pp-h">המשוב של ניר, תחנה אחרי תחנה</h3>
        <div className="pp-fb">
          {STATIONS.map((s) => (
            <div key={s.id}>
              <b>{s.label} <em style={{ color: col(scores[s.id]) }}>{scores[s.id]}/10</em></b>
              <p><span className="ok">מה טוב:</span> {report.feedback[s.id].good}</p>
              <p><span className="fix">מה לתקן:</span> {report.feedback[s.id].fix}</p>
            </div>
          ))}
        </div>
      </section>

      {/* plan */}
      <section className="pp-page">
        <h3 className="pp-h">התוכנית ל-2027</h3>
        <p className="pp-goal">{report.plan.goal}</p>
        <div className="pp-north">{report.plan.north_star.map((n, i) => <div key={i}><small>{n.label}</small><b>{n.value}</b></div>)}</div>
        <div className="pp-q">
          {report.plan.quarters.map((q, i) => <div key={i}><span>Q{i + 1}</span><b>{q.theme}</b><ul>{q.actions.map((a, j) => <li key={j}>{a}</li>)}</ul></div>)}
        </div>
        <h3 className="pp-h">90 הימים הראשונים</h3>
        <ol className="pp-90">{report.plan.first90.map((f, i) => <li key={i}><b>{f.when}</b> {f.task}</li>)}</ol>
      </section>

      <section className="pp-page">
        <h3 className="pp-h">המדדים שמודדים כל שבוע</h3>
        <table className="pp-table">
          <thead><tr><th>מדד</th><th>היום</th><th>יעד 2027</th></tr></thead>
          <tbody>{report.plan.kpis.map((k, i) => <tr key={i}><td>{k.name}</td><td>{k.now}</td><td><b>{k.target}</b></td></tr>)}</tbody>
        </table>
        <h3 className="pp-h">תוכנית ההון והנדל״ן ל-10 שנים</h3>
        <p>{report.plan.capital.verdict}</p>
        <ol className="pp-90">{report.plan.capital.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <blockquote className="pp-note"><p>״{report.nir_note}״</p><cite>ניר דובדבני</cite></blockquote>
        <p className="pp-foot">התוכנית מבוססת על התשובות שלך ונועדה לכוון. היא לא ייעוץ פיננסי, משפטי או השקעות. רוצה ליישם אותה עם יועץ? dubdebot.vercel.app</p>
      </section>
    </div>
  );
}
