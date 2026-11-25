"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
import { MoreSheet } from "./BottomNav";
import { RoomsGrid } from "./Rooms";
import TextSize from "./TextSize";
import { storyOfDay } from "@/lib/rooms";
import { trackWaJoin } from "./EventsPopup";
import type { ConvItem, ShellUser } from "@/lib/data";
import type { Step } from "@/lib/home";
import { webinarLabel, WEBINAR_PUBLIC, WEBINAR_TIME, WEBINAR_WA_GROUP } from "@/lib/webinarDates";
import OnboardingCard from "./OnboardingCard";

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const MONTHS = ["בינואר", "בפברואר", "במרץ", "באפריל", "במאי", "ביוני", "ביולי", "באוגוסט", "בספטמבר", "באוקטובר", "בנובמבר", "בדצמבר"];

/** Real questions owners ask, rotated in the ask bar and offered as one-tap chips. */
const HINTS = [
  "איך מעלים מחירים בלי לאבד לקוחות?",
  "למה יש מחזור ואין רווח?",
  "תבנה לי תכנית שיווק לחודש הקרוב",
  "איך סוגרים יותר בשיחת מכירה?",
  "כמה באמת נשאר לי בסוף החודש?",
];
const CHIPS = [
  { b: "להעלות מחירים", t: "איך אני מעלה מחירים בעסק שלי בלי לאבד לקוחות?" },
  { b: "מחזור בלי רווח", t: "יש לי מחזור טוב אבל לא נשאר לי כסף. איפה הכסף בורח?" },
  { b: "תכנית שיווק", t: "תבנה לי תכנית שיווק ל-30 הימים הקרובים לעסק שלי." },
  { b: "לסגור יותר", t: "איך אני סוגר יותר עסקאות בשיחת מכירה?" },
];

function RotatingHint() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % HINTS.length), 3200);
    return () => clearInterval(t);
  }, []);
  return <span className="ask-hint" key={i}>{HINTS[i]}</span>;
}

function greeting(h: number) {
  if (h >= 5 && h < 12) return "בוקר טוב";
  if (h >= 12 && h < 17) return "צהריים טובים";
  if (h >= 17 && h < 22) return "ערב טוב";
  return "לילה טוב";
}

/** Hand a question to the chat; ChatClient picks it up on load. */
function ask(text: string) {
  try { sessionStorage.setItem("dd_ask", text); } catch {}
  window.location.href = "/chat?new=1";
}

export default function HomeClient({ user, conversations, steps, xrayScore, quote, webinarDate }: { user: ShellUser; conversations: ConvItem[]; steps: Step[]; xrayScore: number | null; quote: string; webinarDate: string }) {
  const [side, setSide] = useState(false);
  const [more, setMore] = useState(false);
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const story = storyOfDay();

  const runStep = (s: Step) => {
    if (s.key === "events") return window.dispatchEvent(new Event("dd:open-events"));
    if (s.key === "wa") { trackWaJoin(); window.open(WEBINAR_WA_GROUP, "_blank", "noopener"); return; }
    if (s.href) window.location.href = s.href;
  };

  return (
    <div className="app home-app">
      <Sidebar active="home" conversations={conversations} user={user} open={side} onClose={() => setSide(false)} />
      <main className="main home-main">
        <div className="home">
          <header className="home-top">
            <button className="icon-btn mobile-only home-ibtn" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={19} /></button>
            <img className="home-logo" src="/logo-duvdevani-white.png" alt="קבוצת דובדבני" />
            <TextSize />
            <button className="home-avatar" onClick={() => setMore(true)} aria-label="החשבון והכלים">{user.firstName.slice(0, 1)}</button>
          </header>

          <div className="home-hello">
            <p>יום {DAYS[now.getDay()]} · {now.getDate()} {MONTHS[now.getMonth()]}</p>
            <h1>{greeting(now.getHours())}, <em>{user.firstName}</em></h1>
          </div>


          <Link className="home-ask home-ask-top" href="/chat?new=1" aria-label="שאלו את ניר כל דבר על העסק">
            <span className="ask-face"><img src="/nir/talk-face.jpg" alt="" /><em aria-hidden="true" /></span>
            <RotatingHint />
            <i><Icon name="mic" size={17} /></i>
          </Link>
          <div className="home-chips" role="group" aria-label="שאלות מהירות לניר">
            {CHIPS.map((c) => <button key={c.b} className="home-chip" onClick={() => ask(c.t)}>{c.b}</button>)}
          </div>

          <OnboardingCard />

          <Link className="home-card ck-home" href="/checkup" aria-label="צ׳קאפ אישי ועסקי ותוכנית ל-2027">
            <span className="ck-home-ring" aria-hidden>?<small>/10</small></span>
            <span className="ck-home-txt">
              <small>במתנה מניר · כ-10 דקות</small>
              <b>הצ׳קאפ האישי והעסקי + תוכנית ל-2027</b>
              <span className="muted">ציון לעסק וציון לך: בית, משכנתא, נדל״ן ופרישה. ותוכנית מפורטת לשנה הקרובה.</span>
            </span>
            <Icon name="arrowLeft" size={20} className="ico-move" />
          </Link>

          {next && (
            <section className="home-card home-next" aria-label="הצעד הבא שלך">
              <div className="home-next-row">
                <span className="home-next-ico"><Icon name={next.key === "xray" ? "scan" : next.key === "money" ? "coin" : next.key === "events" ? "calendar" : next.key === "vault" ? "vault" : "chat"} size={22} /></span>
                <div className="home-next-txt">
                  <small>הצעד הבא שלך · {doneCount} מתוך {steps.length}</small>
                  <b>{next.title}</b>
                  {next.sub && <span>{next.sub}</span>}
                </div>
                <button className="home-go" onClick={() => runStep(next)}>{next.key === "wa" ? "להצטרף" : "להתחיל"}</button>
              </div>
              <div className="home-bar" aria-hidden="true">
                {steps.map((s) => <i key={s.key} className={s.done ? "on" : s === next ? "now" : ""} />)}
              </div>
            </section>
          )}

          <h2 className="home-q">לאיזה חדר נכנסים היום?</h2>
          <RoomsGrid />
          <Link className="home-card home-story home-studio" href="/studio">
            <span className="home-next-ico"><Icon name="spark" size={22} /></span>
            <div className="home-next-txt"><small>סטודיו גרפיקה</small><b>לעצב פוסט, סטורי או מודעה</b><span>8 סגנונות, ניר כותב את הטקסט, מורידים בלחיצה.</span></div>
            <Icon name="arrow" size={20} />
          </Link>


          <Link className="home-card home-story" href="/rooms/social#story">
            <span className="home-next-ico"><Icon name="image" size={22} /></span>
            <div className="home-next-txt">
              <small>הסטורי של היום</small>
              <b>{story.title}</b>
              <span>3 פריימים, 2 דקות. ניר כותב לך את הטקסט.</span>
            </div>
            <Icon name="arrow" size={20} />
          </Link>


          <div className="home-row">
            <Link className="home-card home-mini" href="/xray">
              <small>הרנטגן שלך</small>
              {xrayScore !== null ? <b className="num">{xrayScore}<em>/100</em></b> : <b>עוד לא נבדק</b>}
            </Link>
            {WEBINAR_PUBLIC ? (
              <button className="home-card home-mini" onClick={() => window.dispatchEvent(new Event("dd:open-events"))}>
                <small>הוובינר הבא</small>
                <b>{webinarLabel(webinarDate)} · {WEBINAR_TIME}</b>
              </button>
            ) : (
              <Link className="home-card home-mini" href="/plans">
                <small>המסלולים</small>
                <b>פגישה אישית עם ניר</b>
              </Link>
            )}
          </div>

          <section className="home-hero home-hero-sm" aria-label="המשפט של ניר להיום">
            <img src="/nir/home-suit.webp" alt="ניר דובדבני" />
            <div className="home-hero-scrim" aria-hidden="true" />
            <div className="home-hero-txt">
              <span className="home-pill">המשפט של ניר להיום</span>
              <p className="home-quote">{quote}</p>
              <button className="home-hero-btn" onClick={() => ask(`ניר, המשפט שלך להיום: "${quote}". איך אני מיישם את זה השבוע בעסק שלי?`)}>
                <Icon name="chat" size={15} /> איך מיישמים את זה אצלי?
              </button>
            </div>
          </section>
        </div>
      </main>
      <MoreSheet open={more} onClose={() => setMore(false)} />
    </div>
  );
}
