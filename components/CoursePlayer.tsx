"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
import { askNir } from "./Rooms";
import type { ConvItem, ShellUser } from "@/lib/data";

export type Lesson = { id: string; n: number; title: string; duration: number; embed: string };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const KEY = (c: number) => `dd_course_${c}`;

/** Course videos inside the app: player on top, lesson list below, progress kept on this device. */
export default function CoursePlayer({ user, conversations, course, lessons, locked, startLesson, startAt }: {
  user: ShellUser; conversations: ConvItem[]; course: { id: number; title: string; blurb: string }; lessons: Lesson[]; locked: boolean; startLesson: number | null; startAt: number;
}) {
  const [side, setSide] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [cur, setCur] = useState(() => {
    const i = startLesson ? lessons.findIndex((l) => l.n === startLesson) : -1;
    return i >= 0 ? i : 0;
  });
  const [t0, setT0] = useState(startAt);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY(course.id)) || "null");
      if (v?.done) setDone(v.done);
      if (!startLesson && typeof v?.last === "number" && v.last < lessons.length) setCur(v.last);
    } catch {}
  }, [course.id, lessons.length, startLesson]);

  function save(nextDone: string[], last: number) {
    try { localStorage.setItem(KEY(course.id), JSON.stringify({ done: nextDone, last })); } catch {}
  }
  function go(i: number) {
    setCur(i); setT0(0); save(done, i);
    document.querySelector(".home-main")?.scrollTo({ top: 0, behavior: "smooth" });
  }
  function toggleDone(l: Lesson) {
    const next = done.includes(l.id) ? done.filter((x) => x !== l.id) : [...done, l.id];
    setDone(next); save(next, cur);
  }

  const l = lessons[cur];
  const src = useMemo(() => {
    if (!l?.embed) return "";
    const u = new URL(l.embed);
    u.searchParams.set("title", "0"); u.searchParams.set("byline", "0"); u.searchParams.set("portrait", "0"); u.searchParams.set("dnt", "1");
    return u.toString() + (t0 ? `#t=${t0}s` : "");
  }, [l, t0]);
  const pct = lessons.length ? Math.round((done.length / lessons.length) * 100) : 0;

  return (
    <div className="app home-app">
      <Sidebar active="courses" conversations={conversations} user={user} open={side} onClose={() => setSide(false)} />
      <main className="main home-main">
        <div className="home room cp">
          <header className="home-top">
            <button className="icon-btn mobile-only home-ibtn" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={19} /></button>
            <Link href="/courses" className="room-back"><Icon name="arrow" size={18} /> כל הקורסים</Link>
          </header>

          <div className="cp-head">
            <h1>{course.title}</h1>
            <div className="cp-prog" aria-label={`התקדמות: ${pct}%`}>
              <span className="cp-bar"><i style={{ width: `${pct}%` }} /></span>
              <small className="num">{done.length} מתוך {lessons.length} שיעורים</small>
            </div>
          </div>

          {locked ? (
            <div className="cmp-card"><p className="cb-lead"><Icon name="lock" size={18} /> השיעורים נפתחים במנוי הפלטפורמה.</p><Link className="btn btn-primary btn-lg" href="/plans">למסלולים</Link></div>
          ) : !l ? (
            <div className="cmp-card"><p>השיעורים של הקורס הזה עוד בהעלאה. בינתיים אפשר להיכנס מעמוד הקורסים.</p></div>
          ) : (
            <section className="cp-now" aria-labelledby="cp-t">
              <div className="cp-frame">
                <iframe key={src} src={src} title={l.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              </div>
              <span className="room-kicker cp-kicker">שיעור {l.n} · {mmss(l.duration)}</span>
              <h2 id="cp-t">{l.title}</h2>
              <div className="cp-btns">
                <button className={`btn btn-lg ${done.includes(l.id) ? "btn-glass" : "btn-primary"}`} onClick={() => toggleDone(l)}>
                  <Icon name="check" size={18} /> {done.includes(l.id) ? "סיימתי ✓" : "סיימתי את השיעור"}
                </button>
                {cur < lessons.length - 1 && <button className="btn btn-ghost btn-lg" onClick={() => { if (!done.includes(l.id)) toggleDone(l); go(cur + 1); }}>לשיעור הבא <Icon name="arrow" size={18} /></button>}
              </div>
              <button className="btn btn-ghost cp-ask" onClick={() => askNir(`ניר, צפיתי בשיעור "${l.title}" מהקורס ${course.title}. איך אני מיישם את זה השבוע בעסק שלי?`)}>
                <Icon name="chat" size={16} /> איך מיישמים את השיעור אצלי?
              </button>
            </section>
          )}

          {!locked && lessons.length > 0 && (
            <section aria-labelledby="cp-list-h" className="cp-list-wrap">
              <h2 id="cp-list-h" className="room-sub">כל השיעורים</h2>
              <ol className="cp-list">
                {lessons.map((x, i) => (
                  <li key={x.id}>
                    <button className={i === cur ? "on" : ""} aria-current={i === cur ? "true" : undefined} onClick={() => go(i)}>
                      <span className={`cp-n num ${done.includes(x.id) ? "ok" : ""}`}>{done.includes(x.id) ? "✓" : x.n}</span>
                      <span className="cp-lt">{x.title}</span>
                      <small className="num">{mmss(x.duration)}</small>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
