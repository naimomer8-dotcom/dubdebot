"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
import { LIBRARY } from "@/lib/courses";
import { ROOMS, roomHref, storyOfDay, type Room, type RoomAction } from "@/lib/rooms";
import type { ConvItem, ShellUser } from "@/lib/data";

/** Hand a ready question to the chat (ChatClient sends it on load). */
export function askNir(text: string) {
  try { sessionStorage.setItem("dd_ask", text); } catch {}
  window.location.href = "/chat?new=1";
}

export function runAction(a: RoomAction) {
  if (a.kind === "href") window.location.href = a.href;
  else if (a.kind === "tool") window.location.href = `/chat?tool=${a.tool}`;
  else askNir(a.text);
}

/** The home screen's main block: 6 big rooms, one tap each. */
export function RoomsGrid() {
  return (
    <nav className="rooms" aria-label="החדרים">
      {ROOMS.map((r) => (
        <Link key={r.id} href={roomHref(r)} className={`room-tile room-${r.id}`}>
          <span className="room-ico" aria-hidden="true"><Icon name={r.icon} size={26} /></span>
          <b>{r.title}</b>
          <small>{r.tagline}</small>
        </Link>
      ))}
    </nav>
  );
}

/** Free-text question to Nir, scoped to the room. */
function AskBox({ room }: { room: Room }) {
  const [q, setQ] = useState("");
  return (
    <form className="room-ask" onSubmit={(e) => { e.preventDefault(); if (q.trim()) askNir(`${room.title}: ${q.trim()}`); }}>
      <label htmlFor="room-q">יש לך שאלה אחרת על {room.title}?</label>
      <div className="room-ask-row">
        <input id="room-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="כתבו לניר במילים שלכם" />
        <button className="btn btn-primary" type="submit" disabled={!q.trim()}>שליחה</button>
      </div>
    </form>
  );
}

/** "I posted today" counter, kept on this device: days in a row with a story. */
function StoryStreak() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const [st, setSt] = useState<{ last: string; n: number }>({ last: "", n: 0 });
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem("dd_story") || "null"); if (v?.last) setSt(v); } catch {} }, []);
  const yesterday = new Date(Date.now() - 864e5).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const alive = st.last === today || st.last === yesterday ? st.n : 0;
  const done = st.last === today;
  function mark() {
    if (done) return;
    const next = { last: today, n: alive + 1 };
    setSt(next);
    try { localStorage.setItem("dd_story", JSON.stringify(next)); } catch {}
  }
  return (
    <div className="story-streak">
      <b>{alive > 0 ? `🔥 ${alive} ${alive === 1 ? "יום" : "ימים"} ברצף` : "עוד לא העליתם היום"}</b>
      <button className="btn btn-glass btn-sm" aria-pressed={done} onClick={mark}>{done ? "✓ העליתי היום" : "העליתי סטורי היום"}</button>
    </div>
  );
}

function StoryCard() {
  const s = storyOfDay();
  return (
    <section id="story" className="room-story" aria-labelledby="story-h">
      <span className="room-kicker">הסטורי של היום · 2 דקות</span>
      <h2 id="story-h">{s.title}</h2>
      <ol>
        {s.frames.map((f, i) => <li key={i}><span className="num">{i + 1}</span>{f}</li>)}
      </ol>
      <div className="room-story-btns">
        <button className="btn btn-primary btn-lg" onClick={() => askNir(`ניר, הסטורי של היום הוא "${s.title}". תכתוב לי טקסט קצר לכל אחד מ-3 הפריימים, מותאם לעסק שלי, ומה לצלם בכל אחד. אם אתה לא יודע מה העסק שלי, תשאל קודם.`)}>
          <Icon name="edit" size={18} /> ניר, תכתוב לי את הטקסטים
        </button>
      </div>
      <StoryStreak />
      <p className="room-hint">מעלים כל יום. סטורי אחד ביום עושה יותר מפוסט מושלם פעם בחודש.</p>
    </section>
  );
}

export function RoomClient({ room, user, conversations }: { room: Room; user: ShellUser; conversations: ConvItem[] }) {
  const [side, setSide] = useState(false);
  const courses = room.courses.map((id) => LIBRARY.find((c) => c.id === id)).filter((c): c is (typeof LIBRARY)[number] => !!c);
  return (
    <div className="app home-app">
      <Sidebar active="home" conversations={conversations} user={user} open={side} onClose={() => setSide(false)} />
      <main className="main home-main">
        <div className="home room">
          <header className="home-top">
            <button className="icon-btn mobile-only home-ibtn" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={19} /></button>
            <Link href="/home" className="room-back"><Icon name="arrow" size={18} /> חזרה לבית</Link>
          </header>

          <div className="room-head">
            <span className="room-ico room-ico-lg" aria-hidden="true"><Icon name={room.icon} size={30} /></span>
            <div>
              <h1>חדר ה{room.title}</h1>
              <p>{room.intro}</p>
            </div>
          </div>

          {room.chips && (
            <section className="room-chips" aria-labelledby="chips-h">
              <h2 id="chips-h" className="room-sub">מה הכי בוער לך עכשיו?</h2>
              <p className="room-hint">לוחצים על מה שמתאים, וניר עונה ונותן צעד ראשון.</p>
              <div className="room-chip-row">
                {room.chips.map((ch) => (
                  <button key={ch} className="room-chip" onClick={() => askNir(`${room.title}: ${ch}. תשאל אותי 2 שאלות קצרות כדי להבין את המצב, ואז תן לי צעד ראשון ברור שאני עושה השבוע.`)}>{ch}</button>
                ))}
              </div>
            </section>
          )}

          {room.id === "social" && <StoryCard />}

          <section aria-label={`מה עושים בחדר ה${room.title}`} className="room-actions">
            <h2 className="room-sub">מה עושים כאן? בוחרים אחד</h2>
            {room.items.map((it, i) => (
              <button key={it.key} className={`room-act ${i === 0 ? "main" : ""}`} onClick={() => runAction(it.action)}>
                <span className="room-act-ico" aria-hidden="true"><Icon name={it.icon} size={24} /></span>
                <span className="room-act-txt"><b>{it.title}</b><small>{it.desc}</small></span>
                <Icon name="arrow" size={20} className="room-act-go" />
              </button>
            ))}
          </section>

          {courses.length > 0 && (
            <section className="room-courses" aria-labelledby="rc-h">
              <h2 id="rc-h" className="room-sub">ללמוד את זה מניר</h2>
              <p className="room-hint">שואלים את ניר בצ׳אט, והוא אומר באיזה שיעור ובאיזו דקה הוא מדבר על זה.</p>
              <div className="room-course-list">
                {courses.map((c) => (
                  <Link key={c.id} href={`/courses/${c.id}`} className="room-course">
                    <Icon name="layers" size={20} />
                    <span><b>{c.title}</b><small>{c.blurb}</small></span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <AskBox room={room} />
        </div>
      </main>
    </div>
  );
}
