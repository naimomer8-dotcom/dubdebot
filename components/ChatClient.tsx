"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Mascot, { Mood } from "./Mascot";
import Spotlight from "./Spotlight";
import Sidebar from "./Sidebar";
import NirPhoto from "./NirPhoto";
import NirPose from "./NirPose";
import Icon from "./Icon";
import LeadModal, { MeetingType } from "./LeadModal";
import ForecastStudio from "./ForecastStudio";
import VoiceCall from "./VoiceCall";
import Confetti from "./Confetti";
import { TOOLS, ToolMode } from "@/lib/persona";
import { ForecastInput, toPrompt } from "@/lib/forecast";
import { toPrompt as xrayPrompt } from "@/lib/xray";
import { ACCEPT, Prepared, prepareFile } from "@/lib/attach";
import type { ConvItem, ShellUser } from "@/lib/data";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";

export type ChatAttachment = { name: string; kind: "image" | "pdf" | "doc"; preview?: string };
export type ChatMessage = {
  id: string | null;
  role: "user" | "assistant";
  content: string;
  cta?: string | null;
  rating?: 1 | -1;
  saved?: boolean;
  attachments?: ChatAttachment[];
};

const META_SEP = "\u0000DDMETA";

const QUICK_STARTS = [
  { b: "העסק שלי תקוע", s: "המחזור לא זז כבר חצי שנה", t: "העסק שלי תקוע. המחזור לא זז כבר חצי שנה. מאיפה מתחילים?" },
  { b: "להעלות מחירים", s: "בלי לאבד את הלקוחות הטובים", t: "אני רוצה להעלות מחירים ופוחד לאבד לקוחות. איך עושים את זה נכון?" },
  { b: "לצאת מזמן = כסף", s: "12 שעות ביום, ואין כסף", t: "אני עובד 12 שעות ביום ולא רואה כסף. איך יוצאים ממשוואת זמן = כסף?" },
  { b: "גיוס עובד ראשון", s: "מתי זה הזמן, ואיך לא לטעות", t: "אני שוקל לגייס עובד ראשון. איך אני יודע שזה הזמן, ואיך לא לטעות?" },
];

const MD: Components = {
  table: ({ children }) => (
    <div className="tbl">
      <table>{children}</table>
    </div>
  ),
};

type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export default function ChatClient({
  user,
  conversations,
  leadSentInitially,
  initialConversationId,
  initialMessages,
  initialTool,
  autoXray,
}: {
  user: ShellUser;
  conversations: ConvItem[];
  leadSentInitially: boolean;
  initialConversationId: string | null;
  initialMessages: ChatMessage[];
  initialTool: ToolMode | null;
  autoXray: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [mode, setMode] = useState<ToolMode>("chat");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [modal, setModal] = useState<{ type: MeetingType; trigger: string | null } | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [leadSent, setLeadSent] = useState(leadSentInitially);
  const [confetti, setConfetti] = useState(0);
  const [studio, setStudio] = useState(false);
  const [call, setCall] = useState(false);
  const [side, setSide] = useState(false);
  const [recording, setRecording] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  const [files, setFiles] = useState<Prepared[]>([]);
  const [fileBusy, setFileBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [toast, setToast] = useState<{ text: string; link?: boolean } | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stick = useRef(true);
  const booted = useRef(false);

  useEffect(() => {
    if (stick.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: streaming ? "auto" : "smooth" });
  }, [messages, busy, streaming]);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setCanVoice(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const track = useCallback(
    (type: string, meta: Record<string, unknown> = {}) => {
      fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, conversationId, meta }) }).catch(() => {});
    },
    [conversationId]
  );

  function autosize() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  const send = useCallback(
    async (text: string, forcedMode?: ToolMode, withFiles: Prepared[] = []) => {
      const msg = text.trim();
      if ((!msg && !withFiles.length) || busy) return;
      const useMode = forcedMode ?? mode;
      stick.current = true;
      setInput("");
      setFiles([]);
      requestAnimationFrame(autosize);
      setBusy(true);
      const atts: ChatAttachment[] = withFiles.map((f) => ({ name: f.name, kind: f.kind, preview: f.preview }));
      setMessages((m) => [...m, { id: null, role: "user", content: msg, attachments: atts }, { id: null, role: "assistant", content: "" }]);

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
          body: JSON.stringify({
            message: msg,
            mode: useMode,
            conversationId,
            attachments: withFiles.map((f) => ({ name: f.name, mime: f.mime, data: f.data, text: f.text })),
          }),
        });
      } catch {
        return fail("אין חיבור כרגע. בדוק את האינטרנט ושלח שוב.");
      }
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (res.status === 413) return fail("הקבצים כבדים מדי. נסה פחות קבצים או קובץ קטן יותר.");
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
      if (window.matchMedia("(pointer: fine)").matches) taRef.current?.focus();
    },
    [busy, mode, conversationId]
  );

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

  // things carried in from the landing page / x-ray / deep links
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    try {
      const fc = sessionStorage.getItem("dd_forecast");
      const xr = sessionStorage.getItem("dd_xray");
      const xrId = sessionStorage.getItem("dd_xray_id");
      const tool = sessionStorage.getItem("dd_tool") as ToolMode | "call" | "upload" | "vault" | "scan" | "xray" | null;
      sessionStorage.removeItem("dd_forecast");
      sessionStorage.removeItem("dd_tool");
      if (xrId) {
        sessionStorage.removeItem("dd_xray_id");
        fetch("/api/xray", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: xrId }) }).catch(() => {});
      }
      if (xr && (autoXray || xrId)) {
        sessionStorage.removeItem("dd_xray");
        setMode("workplan");
        send(xrayPrompt(JSON.parse(xr)), "workplan");
        return;
      }
      if (fc) {
        setMode("forecast");
        send(toPrompt(JSON.parse(fc) as ForecastInput), "forecast");
        return;
      }
      const pr = sessionStorage.getItem("dd_prompt");
      if (pr) {
        sessionStorage.removeItem("dd_prompt");
        send(pr, "workplan");
        setMode("workplan");
        return;
      }
      const t = initialTool ?? tool;
      if (t === "scan") return void (window.location.href = "/scan");
      if (t === "xray") return void (window.location.href = "/xray");
      if (t === "call") setCall(true);
      else if (t === "upload") fileRef.current?.click();
      else if (t === "vault") window.location.href = "/vault";
      else if (t && TOOLS.some((x) => x.id === t)) startTool(t as ToolMode);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard: ⌘/Ctrl+K new chat, ⌘/Ctrl+J voice call
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        window.location.href = "/chat?new=1";
      }
      if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        setCall(true);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  async function addFiles(list: FileList | File[]) {
    const arr = Array.from(list).slice(0, 5 - files.length);
    if (!arr.length) return;
    setFileBusy(true);
    const out: Prepared[] = [];
    for (const f of arr) {
      try {
        out.push(await prepareFile(f));
      } catch (e) {
        setToast({ text: (e as Error).message || "לא הצלחתי לקרוא את הקובץ" });
      }
    }
    setFiles((cur) => [...cur, ...out]);
    setFileBusy(false);
    taRef.current?.focus();
    if (out.length) track("file_attached", { kinds: out.map((o) => o.kind) });
  }

  function rate(i: number, rating: 1 | -1) {
    const m = messages[i];
    if (!m.id) return;
    setMessages((all) => all.map((x, j) => (j === i ? { ...x, rating } : x)));
    fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: m.id, rating }) }).catch(() => {});
  }

  async function save(i: number) {
    const m = messages[i];
    if (!m.id || m.saved) return;
    setMessages((all) => all.map((x, j) => (j === i ? { ...x, saved: true } : x)));
    const r = await fetch("/api/vault", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: m.id }) }).catch(() => null);
    const j = r && r.ok ? await r.json().catch(() => null) : null;
    if (!j) {
      setMessages((all) => all.map((x, k) => (k === i ? { ...x, saved: false } : x)));
      setToast({ text: "לא הצלחתי לשמור. נסה שוב." });
      return;
    }
    setToast({ text: j.tasks ? `נשמר לתיק, עם ${j.tasks} משימות לביצוע.` : "נשמר לתיק העסקי.", link: true });
  }

  function openLead(type: MeetingType, trigger: string | null) {
    track("cta_clicked", { type, trigger });
    setModal({ type, trigger });
  }

  function toggleDictation() {
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

  const onVoiceTurn = useCallback((u: string, a: string, meta: { conversationId?: string; messageId?: string }) => {
    if (meta.conversationId) setConversationId(meta.conversationId);
    setMessages((m) => [...m, { id: null, role: "user", content: `🎙️ ${u}` }, { id: meta.messageId ?? null, role: "assistant", content: a }]);
  }, []);

  const headMood: Mood = streaming ? "talking" : busy ? "thinking" : recording ? "curious" : "idle";
  const activeTool = TOOLS.find((t) => t.id === mode);
  const lastIdx = messages.length - 1;
  const canSend = !busy && !fileBusy && (!!input.trim() || files.length > 0);

  return (
    <>
      <Spotlight />
      <div className="app">
        <Sidebar
          active="chat"
          mode={mode}
          onTool={startTool}
          conversations={conversations}
          currentId={conversationId}
          user={user}
          leadSent={leadSent}
          onMeet={() => openLead("nir", "sidebar")}
          onCall={() => setCall(true)}
          open={side}
          onClose={() => setSide(false)}
        />

        <main className="main">
          <header className="topbar">
            <div className="who">
              <button className="icon-btn mobile-only" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={20} /></button>
              <Mascot size={42} mood={headMood} />
              <div style={{ minWidth: 0 }}>
                <b>{busy ? (streaming ? "ניר כותב…" : "חושב…") : activeTool && activeTool.id !== "chat" ? activeTool.title : "דובדבוט"}</b>
                <small><span className="dot-live" /> היועץ העסקי שלך · השיטה של ניר דובדבני</small>
              </div>
            </div>
            <div className="topbar-actions">
              <button className="icon-btn" onClick={() => setStudio(true)} aria-label="סטודיו תחזית" title="סטודיו תחזית"><Icon name="chart" size={20} /></button>
              <button className="call-btn" onClick={() => setCall(true)} title="שיחה קולית (Ctrl+J)">
                <Icon name="phone" size={17} /> <span>שיחה קולית</span>
              </button>
              {!leadSent && (
                <button className="btn btn-primary btn-sm" onClick={() => openLead("advisor", "header")}>
                  <Icon name="calendar" size={16} /> <span>פגישה</span>
                </button>
              )}
            </div>
          </header>

          <div
            className="thread"
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
            }}
          >
            <div className="thread-col">
              {messages.length === 0 && (
                <div className="welcome">
                  <div className="welcome-hero"><NirPose pose="welcome" width={230} eager /><Mascot size={64} mood="wink" /></div>
                  <h2 className="h-display">
                    {user.firstName}, <span className="gold">מה בונים היום?</span>
                  </h2>
                  <p>22 שנה אני רואה עסקים נתקעים באותם מקומות. ספר לי מה קורה אצלך, שלח לי דוח או צילום – או תתחיל מאחד מאלה.</p>
                  <div className="welcome-label">שאלות שבעלי עסקים שואלים אותי</div>
                  <div className="starter-grid">
                    {QUICK_STARTS.map((q) => (
                      <button key={q.b} className="starter" onClick={() => send(q.t)}>
                        <b>{q.b}</b>
                        <span>{q.s}</span>
                        <Icon name="arrow" size={18} />
                      </button>
                    ))}
                  </div>
                  <div className="welcome-label">או כלי מהיר</div>
                  <div className="power-row">
                    <a className="power" href="/xray"><Icon name="scan" size={22} /><span>רנטגן עסקי<small>3 דקות · ציון ופרופיל</small></span></a>
                    <a className="power" href="/scan"><Icon name="radar" size={22} /><span>סריקת רשתות<small>איפה אתה נכשל שיווקית</small></span></a>
                    <button className="power" onClick={() => setCall(true)}><Icon name="phone" size={22} /><span>שיחה קולית<small>לדבר עם הדובדבן</small></span></button>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} style={{ display: "contents" }}>
                  {m.role === "user" ? (
                    <div className="msg user">
                      {!!m.attachments?.length && (
                        <div className="attach-row">
                          {m.attachments.map((a, k) => (
                            <span className="att" key={k}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {a.preview ? <img src={a.preview} alt="" /> : <Icon name={a.kind === "image" ? "image" : "file"} size={18} />}
                              <span>{a.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      {m.content && <div className="bubble">{m.content}</div>}
                    </div>
                  ) : (
                    <div className="msg bot">
                      <span className="avatar-bot">
                        <Mascot size={28} mood={streaming && i === lastIdx ? "talking" : busy && i === lastIdx ? "thinking" : "idle"} track={false} />
                      </span>
                      <div className="body">
                        <div className="name"><b>דובדבוט</b></div>
                        <div className="md" id={`msg-${i}`}>
                          {m.content ? (
                            <>
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>{m.content}</ReactMarkdown>
                              {streaming && i === lastIdx && <span className="caret" />}
                            </>
                          ) : (
                            <span className="thinking"><span className="shimmer">עובר על החומרים של ניר…</span></span>
                          )}
                        </div>
                        {m.id && (
                          <div className={`msg-actions ${i === lastIdx ? "show" : ""}`}>
                            <button className={`act ${m.saved ? "on" : ""}`} onClick={() => save(i)} title="שמירה לתיק העסקי">
                              <Icon name={m.saved ? "check" : "bookmark"} size={15} /> {m.saved ? "בתיק" : "שמירה לתיק"}
                            </button>
                            <button className="act" onClick={() => { navigator.clipboard?.writeText(m.content); setToast({ text: "הועתק." }); }} title="העתקה"><Icon name="copy" size={15} /></button>
                            {m.content.length > 600 && (
                              <button className="act" onClick={() => printDeliverable(`msg-${i}`)} title="PDF"><Icon name="download" size={15} /> PDF</button>
                            )}
                            <button className={`act ${m.rating === 1 ? "on" : ""}`} onClick={() => rate(i, 1)} aria-label="תשובה טובה"><Icon name="thumbUp" size={15} /></button>
                            <button className={`act ${m.rating === -1 ? "on" : ""}`} onClick={() => rate(i, -1)} aria-label="תשובה לא טובה"><Icon name="thumbDown" size={15} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {m.cta && !leadSent && !dismissed.has(i) && (
                    <div className="cta-card">
                      <button
                        className="icon-btn x-btn"
                        aria-label="סגירה"
                        onClick={() => {
                          setDismissed((s) => new Set(s).add(i));
                          track("cta_dismissed", { trigger: m.cta });
                        }}
                      >
                        <Icon name="close" size={16} />
                      </button>
                      <div className="cta-mascot cta-photo"><NirPhoto size={104} /><Mascot size={52} mood="wink" track={false} /></div>
                      <div>
                        <span className="eyebrow">הצעד הבא</span>
                        <h4 style={{ marginTop: 10 }}>זה בדיוק הרגע לשבת על זה ביחד.</h4>
                        <p>רוצה פגישת אסטרטגיה עם אחד היועצים שלנו? או לתאם פגישה עם ניר דובדבני בעצמו?</p>
                        <div className="cta-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => openLead("advisor", m.cta ?? null)}>פגישה עם יועץ</button>
                          <button className="btn btn-glass btn-sm" onClick={() => openLead("nir", m.cta ?? null)}><Icon name="crown" size={16} /> פגישה עם ניר</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

            </div>
          </div>

          <div className="composer">
            <div className="composer-in">
              {activeTool && activeTool.id !== "chat" && (
                <div className="mode-pill">
                  <Icon name={activeTool.icon} size={14} /> {activeTool.title}
                  <button onClick={() => setMode("chat")}>יציאה</button>
                </div>
              )}
              <form
                className={`composer-box ${drag ? "drag" : ""}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (canSend) send(input, undefined, files);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
                }}
              >
                {drag && <div className="drop-hint">שחרר כאן – דובדבוט יקרא את זה</div>}
                {(files.length > 0 || fileBusy) && (
                  <div className="attach-row" style={{ padding: "8px 8px 0" }}>
                    {files.map((f) => (
                      <span className="att" key={f.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {f.preview ? <img src={f.preview} alt="" /> : <Icon name="file" size={18} />}
                        <span>{f.name}</span>
                        <button type="button" onClick={() => setFiles((c) => c.filter((x) => x.id !== f.id))} aria-label={`הסרת ${f.name}`}><Icon name="close" size={14} /></button>
                      </span>
                    ))}
                    {fileBusy && <span className="att"><span className="shimmer">קורא את הקובץ…</span></span>}
                  </div>
                )}
                <textarea
                  ref={taRef}
                  rows={1}
                  value={input}
                  placeholder={recording ? "מקשיב…" : files.length ? "מה לבדוק בקובץ?" : "ספר לי על העסק שלך…"}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autosize();
                  }}
                  onPaste={(e) => {
                    const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
                    if (imgs.length) {
                      e.preventDefault();
                      addFiles(imgs);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      if (canSend) send(input, undefined, files);
                    }
                  }}
                  aria-label="הודעה לדובדבוט"
                />
                <div className="composer-bar">
                  <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
                  <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="צירוף קובץ" title="תמונה, PDF, אקסל או Word">
                    <Icon name="clip" size={20} />
                  </button>
                  {canVoice && (
                    <button type="button" className={`icon-btn rec-btn ${recording ? "rec" : ""}`} onClick={toggleDictation} aria-label={recording ? "עצירת הכתבה" : "הכתבה קולית"} title="הכתבה">
                      <Icon name="mic" size={20} />
                    </button>
                  )}
                  <span className="grow" />
                  <button type="button" className="call-btn" onClick={() => setCall(true)} title="שיחה קולית">
                    <Icon name="wave" size={17} /> <span>לדבר עם ניר</span>
                  </button>
                  <button className="send-btn" type="submit" disabled={!canSend} aria-label="שליחה"><Icon name="send" size={19} stroke={2} /></button>
                </div>
              </form>
              <div className="fine">{DISCLAIMER_SHORT}</div>
            </div>
          </div>
        </main>
      </div>

      {studio && (
        <>
          <div className="backdrop" onClick={() => setStudio(false)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="סטודיו תחזית">
            <div className="drawer-head">
              <h3>סטודיו <span className="gold">תחזית</span></h3>
              <button className="icon-btn" onClick={() => setStudio(false)} aria-label="סגירה"><Icon name="close" size={20} /></button>
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

      {call && (
        <VoiceCall
          conversationId={conversationId}
          firstName={user.firstName}
          onTurn={onVoiceTurn}
          onClose={() => setCall(false)}
        />
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
      {toast && (
        <div className="saved-toast" role="status">
          <Icon name="check" size={18} /> {toast.text} {toast.link && <a href="/vault">לתיק ←</a>}
        </div>
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
  <link href="https://fonts.googleapis.com/css2?family=Karantina:wght@700&family=Assistant:wght@400;600;700&display=swap" rel="stylesheet">
  <style>body{font-family:Assistant,Arial,sans-serif;max-width:760px;margin:48px auto;padding:0 28px;color:#16130e;line-height:1.75;font-weight:300}
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #c9a46a;padding-bottom:14px;margin-bottom:34px}
  header b{font-family:Karantina;font-size:44px;font-weight:700}header span{font-size:12px;letter-spacing:.14em;color:#8c6f42}
  h1,h2,h3{font-family:Karantina;font-weight:700;color:#16130e;font-size:32px;margin:24px 0 8px}strong{font-weight:600}
  table{border-collapse:collapse;width:100%;margin:12px 0;font-size:13.5px}th,td{border-bottom:1px solid #e6dcc8;padding:8px 10px;text-align:right}th{color:#8c6f42;font-weight:600}
  footer{margin-top:48px;font-size:11px;color:#8a8275;border-top:1px solid #e6dcc8;padding-top:12px}</style></head>
  <body><header><b>דובדבוט</b><span>DUVDEVANI GROUP · RND.ORG.IL</span></header>${el.innerHTML}
  <footer>הופק על ידי דובדבוט, כלי AI מבית קבוצת דובדבני, על בסיס הנחות שמסרת. לכיוון ראשוני בלבד – אינו תחליף ליועץ עסקי, רו״ח, עו״ד או יועץ השקעות.</footer>
  <script>document.fonts.ready.then(()=>window.print())</script></body></html>`);
  w.document.close();
}
