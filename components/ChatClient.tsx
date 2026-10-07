"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Mascot, { Mood } from "./Mascot";
import { GroupLogo } from "./BrandBar";
import Spotlight from "./Spotlight";
import LeadModal, { MeetingType } from "./LeadModal";
import ForecastStudio from "./ForecastStudio";
import Confetti from "./Confetti";
import { TOOLS, ToolMode } from "@/lib/persona";
import { ForecastInput, toPrompt } from "@/lib/forecast";

export type ChatMessage = {
  id: string | null;
  role: "user" | "assistant";
  content: string;
  cta?: string | null;
  rating?: 1 | -1;
};

const META_SEP = "\u0000DDMETA";

const QUICK_STARTS = [
  { b: "העסק שלי תקוע", s: "המחזור לא זז כבר חצי שנה. מאיפה מתחילים?", t: "העסק שלי תקוע. המחזור לא זז כבר חצי שנה. מאיפה מתחילים?" },
  { b: "להעלות מחירים", s: "איך מעלים מחיר בלי לאבד לקוחות?", t: "אני רוצה להעלות מחירים ופוחד לאבד לקוחות. איך עושים את זה נכון?" },
  { b: "לצאת מזמן = כסף", s: "אני עובד 12 שעות ביום ולא רואה כסף", t: "אני עובד 12 שעות ביום ולא רואה כסף. איך יוצאים ממשוואת זמן = כסף?" },
  { b: "גיוס עובד ראשון", s: "מתי זה הזמן ואיך לא לטעות", t: "אני שוקל לגייס עובד ראשון. איך אני יודע שזה הזמן, ואיך לא לטעות?" },
];

type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export default function ChatClient({
  user,
  initialConversationId,
  initialMessages,
}: {
  user: { firstName: string; fullName: string; phone: string; email: string };
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [mode, setMode] = useState<ToolMode>("chat");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [modal, setModal] = useState<{ type: MeetingType; trigger: string | null } | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [leadSent, setLeadSent] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [studio, setStudio] = useState(false);
  const [recording, setRecording] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const sentCarried = useRef(false);

  // keep scrolled to bottom unless the user scrolled up
  useEffect(() => {
    if (stick.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setCanVoice(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const track = useCallback(
    (type: string, meta: Record<string, unknown> = {}) => {
      fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, conversationId, meta }),
      }).catch(() => {});
    },
    [conversationId]
  );

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }

  const send = useCallback(
    async (text: string, forcedMode?: ToolMode) => {
      const msg = text.trim();
      if (!msg || busy) return;
      const useMode = forcedMode ?? mode;
      stick.current = true;
      setInput("");
      requestAnimationFrame(autosize);
      setBusy(true);
      setMessages((m) => [...m, { id: null, role: "user", content: msg }, { id: null, role: "assistant", content: "" }]);

      const fail = (content: string) => {
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { id: null, role: "assistant", content };
          return c;
        });
        setBusy(false);
        setStreaming(false);
      };

      let res: Response;
      try {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, mode: useMode, conversationId }),
        });
      } catch {
        return fail("אין חיבור כרגע. בדוק את האינטרנט ושלח שוב.");
      }
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!res.ok || !res.body) return fail("משהו נתקע אצלי. שלח שוב את ההודעה.");

      const hc = res.headers.get("X-Conversation-Id");
      if (hc) setConversationId(hc);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let raw = "";
      setStreaming(true);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        raw += dec.decode(value, { stream: true });
        const visible = raw.split(META_SEP)[0];
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { ...c[c.length - 1], content: visible };
          return c;
        });
      }
      const [visible, metaRaw] = raw.split(META_SEP);
      let meta: { conversationId?: string; messageId?: string; cta?: string | null } = {};
      try {
        meta = metaRaw ? JSON.parse(metaRaw) : {};
      } catch {}
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { id: meta.messageId ?? null, role: "assistant", content: visible.trim(), cta: meta.cta ?? null };
        return c;
      });
      if (meta.conversationId) setConversationId(meta.conversationId);
      setStreaming(false);
      setBusy(false);
      taRef.current?.focus();
    },
    [busy, mode, conversationId]
  );

  // forecast built on the landing page → send it right away
  useEffect(() => {
    if (sentCarried.current) return;
    try {
      const raw = sessionStorage.getItem("dd_forecast");
      if (!raw) return;
      sentCarried.current = true;
      sessionStorage.removeItem("dd_forecast");
      const inp = JSON.parse(raw) as ForecastInput;
      setMode("forecast");
      send(toPrompt(inp), "forecast");
    } catch {}
  }, [send]);

  function startTool(id: ToolMode) {
    setMode(id);
    track("tool_opened", { tool: id });
    if (id === "forecast") {
      setStudio(true);
      return;
    }
    const t = TOOLS.find((x) => x.id === id)!;
    if (t.starter) send(t.starter, id);
    else taRef.current?.focus();
  }

  function rate(i: number, rating: 1 | -1) {
    const m = messages[i];
    if (!m.id) return;
    setMessages((all) => all.map((x, j) => (j === i ? { ...x, rating } : x)));
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: m.id, rating }),
    }).catch(() => {});
  }

  function openLead(type: MeetingType, trigger: string | null) {
    track("cta_clicked", { type, trigger });
    setModal({ type, trigger });
  }

  function toggleVoice() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "he-IL";
    rec.interimResults = true;
    rec.continuous = false;
    const base = input ? input + " " : "";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(base + t);
      requestAnimationFrame(autosize);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recRef.current = rec;
    setRecording(true);
    rec.start();
  }

  const headMood: Mood = streaming ? "talking" : busy ? "thinking" : recording ? "curious" : "idle";
  const activeTool = TOOLS.find((t) => t.id === mode);
  const lastIdx = messages.length - 1;

  return (
    <>
      <Spotlight />
      <div className="chat-app">
        <aside className="rail">
          <Link href="/" className="rail-brand">
            <Mascot size={46} />
            <b className="gold">דובדבוט</b>
          </Link>
          <nav className="rail-tools" aria-label="כלים">
            {TOOLS.map((t) => (
              <button key={t.id} aria-pressed={mode === t.id} onClick={() => startTool(t.id)}>
                <i>{t.icon}</i>
                {t.title}
              </button>
            ))}
          </nav>
          <button className="btn btn-line btn-sm" onClick={() => (window.location.href = "/chat?new=1")}>שיחה חדשה</button>
          <div className="rail-foot">
            {!leadSent && (
              <div className="rail-meet">
                <b>לשבת עם ניר</b>
                <p>פגישת אסטרטגיה אישית עם ניר או עם אחד היועצים שלו.</p>
                <button className="btn btn-gold btn-sm" style={{ width: "100%" }} onClick={() => openLead("nir", "rail")}>לתאם פגישה</button>
              </div>
            )}
            <GroupLogo className="rail-logo" />
          </div>
        </aside>

        <main className="chat-main">
          <header className="chat-top">
            <div className="who">
              <Mascot size={50} mood={headMood} />
              <div>
                <b>{busy ? (streaming ? "ניר כותב…" : "חושב…") : "דובדבוט"}</b>
                <small>
                  <span className="live" />
                  היועץ העסקי שלך, על בסיס השיטה של ניר דובדבני
                </small>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-line btn-sm mobile-only" onClick={() => setStudio(true)}>📈</button>
              <button className="btn btn-gold btn-sm mobile-only" onClick={() => openLead("advisor", "header")}>פגישה</button>
            </div>
          </header>

          <div
            className="chat-scroll"
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
          >
            <div className="chat-col">
              {messages.length === 0 && (
                <div className="empty">
                  <Mascot size={110} mood="wink" />
                  <h2>
                    {user.firstName}, <span className="gold">מה בונים היום?</span>
                  </h2>
                  <p>22 שנה אני רואה עסקים נתקעים באותם מקומות. ספר לי מה קורה אצלך, או תתחיל מאחד מאלה.</p>
                  <div className="starter-grid">
                    {QUICK_STARTS.map((q) => (
                      <button key={q.b} className="starter" onClick={() => send(q.t)}>
                        <b>{q.b}</b>
                        <span>{q.s}</span>
                      </button>
                    ))}
                  </div>
                  <div className="chips" style={{ marginTop: 16 }}>
                    {TOOLS.filter((t) => t.id !== "chat").map((t) => (
                      <button key={t.id} className="chip" onClick={() => startTool(t.id)}>{t.icon} {t.title}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} style={{ display: "contents" }}>
                  {m.role === "user" ? (
                    <div className="row user">
                      <div className="bubble" style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                    </div>
                  ) : (
                    <div className="row bot">
                      <Mascot size={38} mood={streaming && i === lastIdx ? "talking" : busy && i === lastIdx ? "thinking" : "idle"} track={false} />
                      <div className="bot-body">
                        <div className="bubble" id={`msg-${i}`}>
                          {m.content ? (
                            <>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                              {streaming && i === lastIdx && <span className="stream-caret" />}
                            </>
                          ) : (
                            <div className="thinking">
                              <span className="dots"><span /><span /><span /></span>
                              עובר על החומרים של ניר
                            </div>
                          )}
                        </div>
                        {m.id && (
                          <div className="msg-tools">
                            <button className={`tbtn ${m.rating === 1 ? "on" : ""}`} onClick={() => rate(i, 1)} aria-label="תשובה טובה">👍</button>
                            <button className={`tbtn ${m.rating === -1 ? "on" : ""}`} onClick={() => rate(i, -1)} aria-label="תשובה לא טובה">👎</button>
                            <button className="tbtn" onClick={() => navigator.clipboard?.writeText(m.content)}>העתקה</button>
                            {m.content.length > 700 && <button className="tbtn" onClick={() => printDeliverable(`msg-${i}`)}>הורדה כ-PDF</button>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {m.cta && !leadSent && !dismissed.has(i) && (
                    <div className="cta-card">
                      <button
                        className="cta-x"
                        aria-label="סגירה"
                        onClick={() => {
                          setDismissed((s) => new Set(s).add(i));
                          track("cta_dismissed", { trigger: m.cta });
                        }}
                      >
                        ✕
                      </button>
                      <div className="cta-mascot"><Mascot size={96} mood="wink" /></div>
                      <div>
                        <h4>זה בדיוק הרגע לשבת על זה ביחד.</h4>
                        <p>רוצה פגישת אסטרטגיה עם אחד היועצים שלנו? או לתאם פגישה עם ניר דובדבני בעצמו?</p>
                        <div className="cta-actions">
                          <button className="btn btn-gold btn-sm" onClick={() => openLead("advisor", m.cta ?? null)}>פגישה עם יועץ</button>
                          <button className="btn btn-line btn-sm" onClick={() => openLead("nir", m.cta ?? null)}>🍒 פגישה עם ניר</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {messages.length > 0 && !busy && (
                <div className="chips">
                  {TOOLS.filter((t) => t.id !== "chat" && t.id !== mode).map((t) => (
                    <button key={t.id} className="chip" onClick={() => startTool(t.id)}>{t.icon} {t.title}</button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="composer">
            <div className="composer-in">
              {activeTool && activeTool.id !== "chat" && (
                <div className="mode-pill">
                  {activeTool.icon} {activeTool.title}
                  <button onClick={() => setMode("chat")}>יציאה</button>
                </div>
              )}
              <form
                className="composer-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
              >
                <textarea
                  ref={taRef}
                  rows={1}
                  value={input}
                  placeholder={recording ? "מקשיב…" : "ספר לי על העסק שלך"}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autosize();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  aria-label="הודעה לדובדבוט"
                />
                {canVoice && (
                  <button type="button" className={`round mic ${recording ? "rec" : ""}`} onClick={toggleVoice} aria-label={recording ? "עצור הקלטה" : "הקלטה קולית"}>
                    🎙️
                  </button>
                )}
                <button className="round send" type="submit" disabled={busy || !input.trim()} aria-label="שליחה">↑</button>
              </form>
              <div className="fine">דובדבוט הוא AI על בסיס השיטה של ניר דובדבני. כיוון עסקי, לא תחליף לרו״ח, עו״ד או יועץ השקעות.</div>
            </div>
          </div>
        </main>
      </div>

      {studio && (
        <>
          <div className="drawer-back" onClick={() => setStudio(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="סטודיו תחזית">
            <div className="drawer-head">
              <h3>סטודיו <span className="gold">תחזית</span></h3>
              <button className="btn btn-line btn-sm" onClick={() => setStudio(false)}>סגירה</button>
            </div>
            <ForecastStudio
              ctaLabel="שלח לדובדבוט לניתוח"
              ctaNote="דובדבוט יקבל את כל המספרים ויפרק אותם."
              onCta={(inp) => {
                setStudio(false);
                setMode("forecast");
                send(toPrompt(inp), "forecast");
              }}
            />
          </div>
        </>
      )}

      {modal && (
        <LeadModal
          initialType={modal.type}
          trigger={modal.trigger}
          user={user}
          conversationId={conversationId}
          onClose={() => setModal(null)}
          onSubmitted={() => {
            setLeadSent(true);
            setConfetti((c) => c + 1);
          }}
        />
      )}
      {confetti > 0 && <Confetti key={confetti} />}
    </>
  );
}

function printDeliverable(elementId: string) {
  const el = document.getElementById(elementId);
  const w = window.open("", "_blank");
  if (!w || !el) return;
  w.document.write(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>דובדבוט – קבוצת דובדבני</title>
  <link href="https://fonts.googleapis.com/css2?family=Karantina:wght@700&family=Assistant:wght@400;700&display=swap" rel="stylesheet">
  <style>body{font-family:Assistant,Arial,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#111;line-height:1.75}
  header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #d9b574;padding-bottom:12px;margin-bottom:28px}
  header b{font-family:Karantina;font-size:40px}h1,h2,h3{font-family:Karantina;color:#8a6d3b;font-size:32px;margin:18px 0 6px}
  table{border-collapse:collapse;width:100%;margin:10px 0}th,td{border-bottom:1px solid #ddd;padding:7px 9px;text-align:right}th{background:#f7efd9}
  footer{margin-top:44px;font-size:12px;color:#777;border-top:1px solid #ddd;padding-top:10px}</style></head>
  <body><header><b>דובדבוט</b><span>קבוצת דובדבני · rnd.org.il</span></header>${el.innerHTML}
  <footer>הופק על ידי דובדבוט, יועץ עסקי AI מבית קבוצת דובדבני. מבוסס על הנחות שמסרת, ואינו ייעוץ פיננסי.</footer>
  <script>document.fonts.ready.then(()=>window.print())</script></body></html>`);
  w.document.close();
}
