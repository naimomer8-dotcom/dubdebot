"use client";

import { useState } from "react";
import Icon from "./Icon";

export function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/\d/.test(pw) && /[A-Za-z֐-׿]/.test(pw)) s++;
  if (/[^A-Za-z0-9֐-׿]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++;
  return s; // 0..4
}
const LABELS = ["", "חלשה", "סבירה", "טובה", "חזקה"];

export default function PasswordField({
  id = "password",
  label = "סיסמה",
  value,
  onChange,
  error,
  meter = false,
  autoComplete = "current-password",
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  meter?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const s = strength(value);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input
          id={id}
          className="input"
          type={show ? "text" : "password"}
          dir="ltr"
          style={{ textAlign: "right", paddingInlineEnd: 50 }}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          placeholder={meter ? "לפחות 8 תווים, אותיות ומספרים" : "••••••••"}
        />
        <button type="button" className="icon-btn pw-eye" onClick={() => setShow(!show)} aria-label={show ? "הסתרת סיסמה" : "הצגת סיסמה"}>
          <Icon name={show ? "lock" : "eye"} size={18} />
        </button>
      </div>
      {meter && value && (
        <div className="pw-meter" aria-live="polite">
          {[1, 2, 3, 4].map((i) => <i key={i} className={i <= s ? `on s${s}` : ""} />)}
          <span>{LABELS[s]}</span>
        </div>
      )}
      {error && <span className="err">{error}</span>}
    </div>
  );
}
