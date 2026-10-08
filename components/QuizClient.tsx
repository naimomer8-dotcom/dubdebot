"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Mascot from "./Mascot";
import Icon from "./Icon";
import Spotlight from "./Spotlight";
import Confetti from "./Confetti";
import { Brand } from "./BrandBar";
import { QUIZZES, type QuizId } from "@/lib/quizzes";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";

/** Self-assessment test. Answers are scored on the server without AI and saved to the vault. */
export default function QuizClient({ id }: { id: QuizId }) {
  const router = useRouter();
  const quiz = QUIZZES[id];
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [leaving, setLeaving] = useState(false);
  const [result, setResult] = useState<{ title: string; md: string; summary: string } | null>(null);
  const [err, setErr] = useState("");
  const q = quiz.questions[idx];

  function choose(v: string | number) {
    if (leaving) return;
    const next = { ...answers, [q.id]: v };
    setAnswers(next);
    setLeaving(true);
    setTimeout(async () => {
      setLeaving(false);
      if (idx < quiz.questions.length - 1) return setIdx(idx + 1);
      const r = await fetch("/api/quiz", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quiz: id, answers: next }) }).catch(() => null);
      if (r?.status === 402) return window.location.reload();
      const j = r?.ok ? await r.json() : null;
      if (!j) return setErr("לא הצלחתי לשמור את התוצאה. נסה שוב.");
      setResult(j);
      window.scrollTo({ top: 0 });
    }, 320);
  }

  function discuss() {
    if (!result) return;
    const msg = id === "disc"
      ? `עשיתי מבחן סגנון תקשורת. יצא: ${result.summary}. איך זה משפיע על המכירות והניהול שלי, ומה לשנות כבר השבוע?`
      : `עשיתי מבחן כושר מכירות. יצא: ${result.summary}. תבנה לי תוכנית אימון של 14 יום לחולשה הכי גדולה, עם תרגיל יומי.`;
    try {
      sessionStorage.setItem("dd_prompt", msg);
    } catch {}
    router.push("/chat?new=1");
  }

  const progress = result ? 100 : Math.round((idx / quiz.questions.length) * 100);
  return (
    <>
      <Spotlight />
      <div className="xr">
        <header className="xr-top">
          <Brand sub={false} size={34} />
          <div className="xr-progress" aria-label={`התקדמות ${progress}%`}>
            <span className="num">{result ? "סיום" : `${idx + 1} / ${quiz.questions.length}`}</span>
            <div className="xr-bar"><i style={{ width: `${progress}%` }} /></div>
          </div>
          <Link href="/tests" className="icon-btn" aria-label="סגירה"><Icon name="close" size={20} /></Link>
        </header>
        <main className="xr-stage">
          {!result ? (
            <div key={q.id} className={`xr-q ${leaving ? "out" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Mascot size={56} mood={leaving ? "thinking" : "curious"} />
                <span className="badge xr-axis">{quiz.title}</span>
              </div>
              <h2 className="h-display">{q.q}</h2>
              <div className="xr-opts" role="radiogroup" aria-label={q.q}>
                {q.options.map((o, i) => (
                  <button key={i} className="xr-opt" role="radio" aria-checked={answers[q.id] === o.v} onClick={() => choose(o.v)}>
                    <kbd>{i + 1}</kbd>
                    <span>{o.t}</span>
                  </button>
                ))}
              </div>
              <div className="xr-nav">
                {idx > 0 ? <button className="btn btn-ghost btn-sm" onClick={() => setIdx(idx - 1)}><Icon name="arrowLeft" size={16} /> הקודמת</button> : <span />}
                {err && <span className="err">{err}</span>}
              </div>
            </div>
          ) : (
            <div className="quiz-result">
              <section className="glass edge quiz-card">
                <span className="eyebrow">{quiz.title}</span>
                <div className="quiz-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{result.md}</ReactMarkdown></div>
                <div className="rep-actions">
                  <button className="btn btn-primary btn-lg" onClick={discuss}>{id === "disc" ? "מה זה אומר על העסק שלי" : "תוכנית אימון ל-14 יום"} <Icon name="arrow" size={18} className="ico-move" /></button>
                  <Link className="btn btn-glass btn-lg" href="/vault"><Icon name="vault" size={18} /> נשמר בתיק</Link>
                  <Link className="btn btn-ghost" href="/tests">מבחן נוסף</Link>
                </div>
              </section>
              <p className="rep-note">{DISCLAIMER_SHORT}</p>
            </div>
          )}
        </main>
      </div>
      {result && <Confetti />}
    </>
  );
}
