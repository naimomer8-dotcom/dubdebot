"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Mascot from "./Mascot";
import NirPhoto from "./NirPhoto";
import NirTalker from "./NirTalker";
import Icon from "./Icon";

type Phase = "connecting" | "listening" | "thinking" | "speaking" | "paused" | "error";
type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};

const META_SEP = "\u0000DDMETA";
const LABEL: Record<Phase, string> = {
  connecting: "מתחבר…",
  listening: "אני מקשיב",
  thinking: "חושב על זה…",
  speaking: "ניר מדבר",
  paused: "בהמתנה",
  error: "משהו השתבש",
};

/**
 * Full-screen voice call with the cherry: speech-to-text → Dubdebot (voice mode) → TTS, hands-free loop.
 * Sentences are voiced as soon as they stream in, and the mascot's mouth follows the audio level.
 */
type Clip = { kind: "buf"; buf: ArrayBuffer } | { kind: "pcm"; res: Response } | null;

const FILLERS: [string, string][] = [
  ["f1", "אוקיי, שנייה אחת."],
  ["f2", "תקשיב, זה טוב."],
  ["f3", "שאלה טובה. רגע."],
  ["f4", "הבנתי. תן לי רגע."],
];

export default function VoiceCall({
  conversationId,
  firstName,
  onTurn,
  onClose,
}: {
  conversationId: string | null;
  firstName: string;
  onTurn: (user: string, assistant: string, meta: { conversationId?: string; messageId?: string }) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [you, setYou] = useState("");
  const [bot, setBot] = useState("");
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const micAnalyser = useRef<AnalyserNode | null>(null);
  const outAnalyser = useRef<AnalyserNode | null>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const mediaRec = useRef<MediaRecorder | null>(null);
  const queue = useRef<Promise<Clip>[]>([]);
  const liveSrcs = useRef<AudioBufferSourceNode[]>([]);
  const playing = useRef(false);
  const streamDone = useRef(false);
  const currentSrc = useRef<AudioBufferSourceNode | null>(null);
  const convId = useRef(conversationId);
  const alive = useRef(true);
  const phaseRef = useRef<Phase>("connecting");
  const ttsOk = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const gen = useRef(0); // bumped on barge-in so stale audio never plays
  const useRecorder = useRef(false); // SpeechRecognition unavailable/blocked → record + server STT
  const mutedRef = useRef(false);
  const pendingHello = useRef<(() => void) | null>(null);
  // short pre-recorded fillers in Nir's voice – played the moment you stop talking, while the real answer is prepared
  const fillers = useRef<{ text: string; buf: ArrayBuffer }[]>([]);
  const lastFiller = useRef(-1);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // ---------- level meter (mic while listening, playback while speaking) ----------
  useEffect(() => {
    let raf = 0;
    const buf = new Uint8Array(1024);
    const tick = () => {
      const an = phaseRef.current === "speaking" ? outAnalyser.current : phaseRef.current === "listening" ? micAnalyser.current : null;
      let v = 0;
      if (an) {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < an.fftSize && i < buf.length; i++) {
          const x = (buf[i] - 128) / 128;
          sum += x * x;
        }
        v = Math.min(1, Math.sqrt(sum / Math.min(an.fftSize, buf.length)) * 4.2);
      } else if (phaseRef.current === "speaking" && !ttsOk.current) {
        v = 0.35 + 0.35 * Math.sin(performance.now() / 90) * Math.sin(performance.now() / 230);
      }
      setLevel((l) => l * 0.55 + v * 0.45);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ---------- speaking ----------
  const fetchTts = useCallback(async (text: string): Promise<Clip> => {
    if (!ttsOk.current) return null;
    try {
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, stream: true }) });
      if (r.status === 503) {
        ttsOk.current = false;
        return null;
      }
      if (!r.ok) return null;
      if ((r.headers.get("Content-Type") ?? "").includes("l16") && r.body) return { kind: "pcm", res: r };
      return { kind: "buf", buf: await r.arrayBuffer() };
    } catch {
      return null;
    }
  }, []);

  /** Plays raw 24kHz PCM as it streams in – audio starts after the first ~0.15s of sound arrives. */
  const playPcm = async (res: Response, g: number) => {
    const ctx = ctxRef.current;
    if (!ctx || !res.body) return false;
    const rd = res.body.getReader();
    const RATE = 24000;
    let pending = new Uint8Array(0);
    let t = ctx.currentTime + 0.04;
    let first = true;
    let played = false;
    let last: AudioBufferSourceNode | null = null;
    const flush = (all: boolean) => {
      const min = first ? RATE * 2 * 0.15 : RATE * 2 * 0.3;
      if (!all && pending.length < min) return;
      const n = pending.length - (pending.length % 2);
      if (n <= 0) return;
      const view = new DataView(pending.buffer, pending.byteOffset, n);
      const ab = ctx.createBuffer(1, n / 2, RATE);
      const ch = ab.getChannelData(0);
      for (let i = 0; i < n / 2; i++) ch[i] = view.getInt16(i * 2, true) / 32768;
      pending = pending.slice(n);
      const src = ctx.createBufferSource();
      src.buffer = ab;
      src.connect(outAnalyser.current!);
      if (t < ctx.currentTime) t = ctx.currentTime + 0.02;
      src.start(t);
      t += ab.duration;
      liveSrcs.current.push(src);
      last = src;
      first = false;
      played = true;
    };
    try {
      while (true) {
        if (g !== gen.current || !alive.current) {
          rd.cancel().catch(() => {});
          return true;
        }
        const { value, done } = await rd.read();
        if (done) break;
        const merged = new Uint8Array(pending.length + value.length);
        merged.set(pending);
        merged.set(value, pending.length);
        pending = merged;
        flush(false);
      }
      flush(true);
    } catch {}
    if (!played) return false;
    // wait for the scheduled audio to finish (or an interruption)
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (g !== gen.current || !alive.current || ctx.currentTime >= t - 0.01) return resolve();
        setTimeout(tick, 40);
      };
      tick();
    });
    liveSrcs.current = liveSrcs.current.filter((x) => x !== last);
    return true;
  };

  const speakBrowser = (text: string) =>
    new Promise<void>((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth || mutedRef.current) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "he-IL";
      const v = synth.getVoices().find((x) => x.lang?.startsWith("he"));
      if (v) u.voice = v;
      u.rate = 1.04;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    });

  const sentences = useRef<string[]>([]);

  const pump = useCallback(async () => {
    if (playing.current) return;
    playing.current = true;
    while (alive.current && (queue.current.length || !streamDone.current)) {
      if (!queue.current.length) {
        await new Promise((r) => setTimeout(r, 60));
        continue;
      }
      const job = queue.current.shift()!;
      const text = sentences.current.shift() ?? "";
      const g = gen.current;
      go("speaking");
      const clip = await job;
      if (!alive.current) break;
      if (g !== gen.current) continue; // user interrupted while this sentence was loading
      if (ctxRef.current && ctxRef.current.state !== "running") await ctxRef.current.resume().catch(() => {});
      if (clip?.kind === "pcm") {
        const ok = await playPcm(clip.res, g);
        if (!ok && text && g === gen.current) await speakBrowser(text);
        continue;
      }
      const buf = clip?.kind === "buf" ? clip.buf : null;
      if (buf && ctxRef.current) {
        try {
          const audio = await ctxRef.current.decodeAudioData(buf.slice(0));
          await new Promise<void>((resolve) => {
            const src = ctxRef.current!.createBufferSource();
            src.buffer = audio;
            src.connect(outAnalyser.current!);
            src.onended = () => resolve();
            currentSrc.current = src;
            src.start();
          });
        } catch {
          await speakBrowser(text);
        }
      } else if (text) {
        await speakBrowser(text);
      }
    }
    playing.current = false;
    currentSrc.current = null;
    if (alive.current && phaseRef.current === "speaking") startListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enqueue = useCallback(
    (s: string, audio?: Promise<Clip>) => {
      const clean = s.replace(/[*#_`>|]/g, "").trim();
      if (clean.length < 2) return;
      sentences.current.push(clean);
      queue.current.push(audio ?? fetchTts(clean));
      pump();
    },
    [fetchTts, pump]
  );

  const stopSpeaking = () => {
    gen.current++;
    abortRef.current?.abort();
    liveSrcs.current.forEach((x) => {
      try {
        x.stop();
      } catch {}
    });
    liveSrcs.current = [];
    try {
      currentSrc.current?.stop();
    } catch {}
    window.speechSynthesis?.cancel();
    queue.current = [];
    sentences.current = [];
    streamDone.current = true;
  };

  // ---------- thinking ----------
  const ask = useCallback(
    async (text: string) => {
      go("thinking");
      setBot("");
      streamDone.current = false;
      if (fillers.current.length) {
        let i = Math.floor(Math.random() * fillers.current.length);
        if (i === lastFiller.current) i = (i + 1) % fillers.current.length;
        lastFiller.current = i;
        const f = fillers.current[i];
        enqueue(f.text, Promise.resolve({ kind: "buf", buf: f.buf.slice(0) }));
      }
      const ac = new AbortController();
      abortRef.current = ac;
      let raw = "";
      let spoken = 0;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, voice: true, mode: "chat", conversationId: convId.current }),
          signal: ac.signal,
        });
        if (res.status === 402) return window.location.reload();
        if (!res.ok || !res.body) throw new Error("bad");
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          raw += dec.decode(value, { stream: true });
          const visible = raw.split(META_SEP)[0];
          setBot(visible);
          // first chunk: start talking at the first comma once there's enough text, so Nir answers fast
          if (spoken === 0) {
            const c = visible.slice(25).search(/[,،;:–]/);
            if (c >= 0 && !/[.!?…\n]/.test(visible.slice(0, 25 + c))) {
              enqueue(visible.slice(0, 25 + c + 1));
              spoken = 25 + c + 1;
            }
          }
          // then voice each finished sentence immediately
          const re = /[^.!?…\n]+[.!?…\n]+/g;
          re.lastIndex = spoken;
          let m: RegExpExecArray | null;
          while ((m = re.exec(visible))) {
            enqueue(m[0]);
            spoken = re.lastIndex;
          }
        }
        const [visible, metaRaw] = raw.split(META_SEP);
        if (visible.slice(spoken).trim()) enqueue(visible.slice(spoken));
        let meta: { conversationId?: string; messageId?: string } = {};
        try {
          meta = metaRaw ? JSON.parse(metaRaw) : {};
        } catch {}
        if (meta.conversationId) convId.current = meta.conversationId;
        onTurn(text, visible.trim(), meta);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        enqueue("אופס, נתקעתי רגע. תגיד שוב?");
      } finally {
        streamDone.current = true;
        // nothing was voiced (empty answer) → don't hang in "thinking"
        setTimeout(() => {
          if (alive.current && !playing.current && phaseRef.current === "thinking") startListening();
        }, 50);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enqueue, onTurn]
  );

  // ---------- listening ----------
  const startListening = useCallback(() => {
    if (!alive.current) return;
    setYou("");
    go("listening");
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (Ctor && !useRecorder.current) {
      const rec = new Ctor();
      rec.lang = "he-IL";
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      let finalText = "";
      let hush: ReturnType<typeof setTimeout> | null = null;
      rec.onresult = (e) => {
        // stop ~0.9s after the words stop changing, instead of waiting for the browser's long timeout
        if (hush) clearTimeout(hush);
        hush = setTimeout(() => {
          try {
            rec.stop();
          } catch {}
        }, 900);
        let t = "";
        finalText = "";
        for (let i = 0; i < e.results.length; i++) {
          t += e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        }
        setYou(t);
        if (!finalText) finalText = t;
      };
      rec.onerror = (ev: unknown) => {
        const err = (ev as { error?: string })?.error ?? "";
        // Siri/dictation off on iOS, blocked, or no Hebrew → switch to recording + server transcription
        if (["not-allowed", "service-not-allowed", "language-not-supported", "audio-capture"].includes(err)) useRecorder.current = true;
      };
      rec.onend = () => {
        if (hush) clearTimeout(hush);
        recRef.current = null;
        if (!alive.current || phaseRef.current !== "listening") return;
        const t = finalText.trim();
        if (t) ask(t);
        else if (useRecorder.current) startListening();
        else go("paused");
      };
      recRef.current = rec;
      try {
        rec.start();
      } catch {
        go("paused");
      }
      return;
    }
    // fallback: record + simple voice-activity detection → server transcription
    const stream = micRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return go("error");
    const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"].find((m) => MediaRecorder.isTypeSupported?.(m));
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = async () => {
      mediaRec.current = null;
      if (!alive.current || phaseRef.current !== "listening") return;
      const blob = new Blob(chunks, { type: mr.mimeType });
      if (blob.size < 2500) return go("paused");
      go("thinking");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const data = btoa(bin);
      const r = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio: data, mime: mr.mimeType }) }).catch(() => null);
      const j = r && r.ok ? await r.json().catch(() => ({})) : {};
      const t = String(j.text ?? "").trim();
      if (!t) return go("paused");
      setYou(t);
      ask(t);
    };
    mediaRec.current = mr;
    mr.start(250);
    const buf = new Uint8Array(1024);
    let heard = false;
    let quietSince = performance.now();
    const started = performance.now();
    const vad = () => {
      if (mediaRec.current !== mr) return;
      const an = micAnalyser.current;
      if (an) {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += ((buf[i] - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        if (rms > 0.035) {
          heard = true;
          quietSince = now;
        }
        if ((heard && now - quietSince > 950) || now - started > 25000 || (!heard && now - started > 9000)) {
          mr.stop();
          return;
        }
      }
      requestAnimationFrame(vad);
    };
    requestAnimationFrame(vad);
  }, [ask]);

  // ---------- lifecycle ----------
  useEffect(() => {
    alive.current = true;
    FILLERS.forEach(([file, text]) =>
      fetch(`/voice/${file}.wav`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((buf) => {
          if (buf && buf.byteLength > 2000) fillers.current.push({ text, buf });
        })
        .catch(() => {})
    );
    fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "call_started", conversationId, meta: {} }) }).catch(() => {});
    (async () => {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        ctxRef.current = ctx;
        const out = ctx.createAnalyser();
        out.fftSize = 1024;
        out.connect(ctx.destination);
        outAnalyser.current = out;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        micRef.current = stream;
        const mic = ctx.createAnalyser();
        mic.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(mic);
        micAnalyser.current = mic;
        // greeting
        streamDone.current = false;
        if (ctx.state !== "running") await ctx.resume().catch(() => {});
        const hello = "שלום, זה ניר. ספר לי, מה הכי בוער לך בעסק עכשיו?";
        setBot(`שלום ${firstName}, זה ניר. ספר לי, מה הכי בוער לך בעסק עכשיו?`);
        // pre-recorded greeting plays instantly; live TTS only if the file is missing
        const pre = fetch("/voice/greeting.wav")
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null)
          .then((b): Promise<Clip> | Clip => (b ? { kind: "buf", buf: b } : fetchTts(hello)));
        const playHello = () => {
          enqueue(hello, pre);
          streamDone.current = true;
        };
        if (ctx.state === "running") playHello();
        else {
          // iOS without a user gesture: wait for one tap
          pendingHello.current = playHello;
          go("paused");
        }
      } catch {
        go("error");
      }
    })();
    return () => {
      alive.current = false;
      stopSpeaking();
      recRef.current?.abort();
      if (mediaRec.current?.state === "recording") mediaRec.current.stop();
      micRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onClose]);

  function mainAction() {
    ctxRef.current?.resume();
    if (pendingHello.current) {
      const f = pendingHello.current;
      pendingHello.current = null;
      f();
      return;
    }
    if (phase === "speaking" || phase === "thinking") {
      stopSpeaking();
      startListening();
    } else if (phase === "listening") {
      recRef.current?.stop();
      if (mediaRec.current?.state === "recording") mediaRec.current.stop();
    } else {
      startListening();
    }
  }

  function toggleMute() {
    const m = !muted;
    setMuted(m);
    mutedRef.current = m;
    if (m) window.speechSynthesis?.cancel();
    if (outAnalyser.current && ctxRef.current) {
      outAnalyser.current.disconnect();
      if (!m) outAnalyser.current.connect(ctxRef.current.destination);
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="call" role="dialog" aria-modal="true" aria-label="שיחה קולית עם דובדבוט">
      <div className="call-head">
        <div className="nir-tag">
          <NirPhoto size={46} />
          <span>
          <b>שיחה עם ניר</b>
          <small className="num">{mm}:{ss} · דובדבוט קולי</small>
          </span>
        </div>
        <span className="badge"><span className="dot-live" /> בשיחה</span>
      </div>

      <div className="call-center">
        <div className={`orb ${phase === "listening" ? "listening" : ""}`} style={{ ["--lvl" as string]: level.toFixed(3) }}>
          <span className="halo" /><span className="halo" /><span className="halo" />
          <span className="core" />
          <NirTalker size={230} level={level} state={phase === "speaking" ? "speaking" : phase === "listening" ? "listening" : phase === "thinking" ? "thinking" : "idle"} />
          <span className="talker-cherry"><Mascot size={72} mood={phase === "thinking" ? "thinking" : phase === "listening" ? "curious" : "idle"} level={phase === "speaking" ? level : undefined} track={false} /></span>
        </div>
        <div className="call-state" aria-live="polite">{LABEL[phase]}</div>
        <p className={`call-caption ${phase === "listening" ? "you" : ""}`}>
          {phase === "listening" ? you || "דבר חופשי, אני כאן." : phase === "error" ? "צריך הרשאה למיקרופון כדי לדבר. אפשר לאשר בדפדפן ולנסות שוב." : phase === "paused" ? "לחץ על הכפתור כשאתה מוכן לדבר." : bot.slice(-220)}
        </p>
      </div>

      <div className="call-controls">
        <div className="cctl">
          <button className={`cbtn ${muted ? "off" : ""}`} onClick={toggleMute} aria-label={muted ? "הפעלת שמע" : "השתקה"}>
            <Icon name={muted ? "mute" : "sound"} size={24} />
          </button>
          <small>{muted ? "מושתק" : "רמקול"}</small>
        </div>
        <div className="cctl">
          <button className={`cbtn main ${phase === "listening" ? "live" : ""}`} onClick={mainAction} aria-label={phase === "listening" ? "סיימתי לדבר" : phase === "speaking" ? "לקטוע ולדבר" : "לדבר"}>
            <Icon name={phase === "listening" ? "stop" : "mic"} size={30} />
          </button>
          <small>{phase === "listening" ? "סיימתי" : phase === "speaking" || phase === "thinking" ? "לקטוע" : "לדבר"}</small>
        </div>
        <div className="cctl">
          <button className="cbtn end" onClick={onClose} aria-label="סיום שיחה">
            <Icon name="phone" size={24} />
          </button>
          <small>סיום</small>
        </div>
      </div>
    </div>
  );
}
