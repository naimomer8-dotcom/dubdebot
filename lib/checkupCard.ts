"use client";
import { STATIONS, grade, type Scores } from "./checkup";

const col = (s: number) => (s >= 8 ? "#8fd9b4" : s >= 6 ? "#e2c68e" : s >= 4 ? "#f0a96a" : "#ff8d8d");

/** 1080×1920 story card of the checkup result (PNG). Canvas, so Hebrew RTL shapes correctly. */
export async function renderCheckupCard(o: { total: number; scores: Scores; business?: string }): Promise<Blob | null> {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  if (!x) return null;
  try { await Promise.all([document.fonts.load('700 300px "Karantina"'), document.fonts.load('700 48px "Assistant"'), document.fonts.load('400 40px "Assistant"')]); } catch {}
  x.direction = "rtl";
  x.fillStyle = "#070708"; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, 640, 0, W / 2, 640, 900);
  g.addColorStop(0, "rgba(226,198,142,0.30)"); g.addColorStop(1, "rgba(226,198,142,0)");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(226,198,142,${Math.random() * 0.4})`; x.beginPath(); x.arc(Math.random() * W, Math.random() * H, Math.random() * 2.2, 0, Math.PI * 2); x.fill(); }

  x.textAlign = "center";
  x.fillStyle = "#e2c68e"; x.font = '700 44px "Assistant"';
  x.fillText("הצ׳קאפ העסקי של ניר דובדבני · 2027", W / 2, 190);
  x.fillStyle = "#c2b9a8"; x.font = '400 40px "Assistant"';
  x.fillText(o.business ? `${o.business} עבר את הצ׳קאפ` : "העסק שלי עבר את הצ׳קאפ", W / 2, 260);

  // ring
  const cx = W / 2, cy = 680, R = 300;
  x.lineWidth = 34; x.strokeStyle = "rgba(255,255,255,0.08)"; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.stroke();
  const gr = x.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  gr.addColorStop(0, "#f8ecd0"); gr.addColorStop(0.5, "#e2c68e"); gr.addColorStop(1, "#8c6f42");
  x.strokeStyle = gr; x.lineCap = "round"; x.beginPath(); x.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * o.total) / 10); x.stroke();
  x.fillStyle = "#f6e6c2"; x.font = '700 300px "Karantina"'; x.fillText(o.total.toFixed(1), cx, cy + 100);
  x.fillStyle = "#857e72"; x.font = '700 44px "Assistant"'; x.fillText("מתוך 10", cx, cy + 170);
  const gw = grade(o.total);
  x.fillStyle = col(o.total); x.font = '700 120px "Karantina"'; x.fillText(gw.word, W / 2, 1150);

  // bars
  const top = 1240, rowH = 50;
  STATIONS.forEach((s, i) => {
    const y = top + i * rowH;
    x.textAlign = "right"; x.fillStyle = "#c2b9a8"; x.font = '400 32px "Assistant"'; x.fillText(s.label, W - 120, y + 12);
    x.fillStyle = "rgba(255,255,255,0.07)"; x.fillRect(150, y - 6, 560, 16);
    x.fillStyle = col(o.scores[s.id]); x.fillRect(150 + 560 * (1 - o.scores[s.id] / 10), y - 6, 560 * (o.scores[s.id] / 10), 16);
    x.textAlign = "left"; x.fillStyle = "#f4eee3"; x.font = '700 34px "Assistant"'; x.fillText(String(o.scores[s.id]), 100, y + 12);
  });
  x.textAlign = "center"; x.fillStyle = "#e2c68e"; x.font = '700 46px "Assistant"';
  x.fillText("כמה העסק שלך מוכן ל-2027? בדוק במתנה", W / 2, H - 130);
  x.fillStyle = "#857e72"; x.font = '400 36px "Assistant"'; x.fillText("dubdebot.vercel.app/checkup", W / 2, H - 75);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}
