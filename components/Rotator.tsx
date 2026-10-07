"use client";
import { useEffect, useState } from "react";

const WORDS = ["תחזית ל-12 חודש", "תוכנית להכפלת העסק", "תסריט שסוגר עסקאות", "בדיקה אם הרעיון שווה כסף", "אימון מול לקוח קשה"];

/** Typewriter that cycles through what Dubdebot can do. */
export default function Rotator() {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(WORDS[i].length);
      const t = setTimeout(() => setI((i + 1) % WORDS.length), 2600);
      return () => clearTimeout(t);
    }
    const word = WORDS[i];
    let t: ReturnType<typeof setTimeout>;
    if (!del && n < word.length) t = setTimeout(() => setN(n + 1), 55);
    else if (!del && n === word.length) t = setTimeout(() => setDel(true), 1800);
    else if (del && n > 0) t = setTimeout(() => setN(n - 1), 25);
    else {
      setDel(false);
      setI((i + 1) % WORDS.length);
    }
    return () => clearTimeout(t);
  }, [i, n, del]);
  return (
    <p className="hero-rotator" aria-live="off">
      בתוך דקות: <span className="word">{WORDS[i].slice(0, n) || " "}</span>
      <span className="caret" aria-hidden="true" />
    </p>
  );
}
