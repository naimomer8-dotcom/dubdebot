/** The 15-minute explanation call: the person picks morning / noon / evening, the rep calls at that window. */
export const SLOTS: { id: "morning" | "noon" | "evening"; word: string; label: string; hour: number }[] = [
  { id: "morning", word: "בוקר", label: "בוקר", hour: 9 },
  { id: "noon", word: "צהר", label: "צהריים", hour: 13 },
  { id: "evening", word: "ערב", label: "ערב", hour: 18 },
];

/** Next working-day time in Israel at `hour` (skips Friday afternoon and Saturday), at least 15 minutes ahead. */
export function nextAt(hour: number, from = Date.now()) {
  for (let add = 0; add < 4; add++) {
    const d = new Date(from + add * 86400_000);
    const ymd = d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short" }).format(d);
    if (wd === "Sat" || (wd === "Fri" && hour >= 13)) continue;
    // Israel is UTC+2 / +3: build the local time and correct by the actual offset
    const guess = new Date(`${ymd}T${String(hour).padStart(2, "0")}:00:00Z`);
    const offH = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", hour: "2-digit", hour12: false }).format(guess)) - hour;
    const t = new Date(guess.getTime() - offH * 3600_000);
    if (t.getTime() > from + 15 * 60_000) return t;
  }
  return new Date(from + 3600_000);
}

export const whenLabel = (t: Date) => t.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
