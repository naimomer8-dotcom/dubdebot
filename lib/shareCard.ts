"use client";
import { AXES, Scores } from "./xray";

/** Renders the X-ray result as a 1080×1920 story image (PNG Blob). Drawn on canvas so Hebrew RTL shapes correctly. */
export async function renderShareCard(opts: {
  total: number;
  archetype: string;
  line: string;
  scores: Scores;
  mascotSvg?: SVGSVGElement | null;
}): Promise<Blob | null> {
  const W = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  try {
    await Promise.all([
      document.fonts.load('700 300px "Karantina"'),
      document.fonts.load('400 80px "Karantina"'),
      document.fonts.load('400 40px "Assistant"'),
      document.fonts.load('500 40px "Assistant"'),
    ]);
  } catch {}
  ctx.direction = "rtl";

  // background
  ctx.fillStyle = "#070708";
  ctx.fillRect(0, 0, W, H);
  const g1 = ctx.createRadialGradient(W * 0.85, 120, 0, W * 0.85, 120, 900);
  g1.addColorStop(0, "rgba(226,198,142,0.28)");
  g1.addColorStop(1, "rgba(226,198,142,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(80, H - 200, 0, 80, H - 200, 900);
  g2.addColorStop(0, "rgba(200,16,46,0.30)");
  g2.addColorStop(1, "rgba(200,16,46,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  const gold = ctx.createLinearGradient(0, 0, W, 0);
  gold.addColorStop(0, "#8c6f42");
  gold.addColorStop(0.5, "#e2c68e");
  gold.addColorStop(1, "#fff4dc");

  // frame
  ctx.strokeStyle = "rgba(226,198,142,0.22)";
  ctx.lineWidth = 2;
  roundRect(ctx, 48, 48, W - 96, H - 96, 48);
  ctx.stroke();

  // header
  ctx.textAlign = "right";
  ctx.fillStyle = "#e2c68e";
  ctx.font = '500 34px "Assistant"';
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "6px";
  ctx.fillText("הרנטגן העסקי שלי", W - 110, 170);
  (ctx as unknown as { letterSpacing: string }).letterSpacing = "0px";
  ctx.fillStyle = "#f4eee3";
  ctx.font = '700 104px "Karantina"';
  ctx.fillText("הנה איפה העסק שלי עומד.", W - 110, 270);

  // score
  ctx.textAlign = "center";
  ctx.fillStyle = gold;
  ctx.font = '700 420px "Karantina"';
  ctx.fillText(String(opts.total), W / 2, 640);
  ctx.fillStyle = "#7f786c";
  ctx.font = '400 38px "Assistant"';
  ctx.fillText("מתוך 100", W / 2, 710);

  ctx.fillStyle = "#f4eee3";
  ctx.font = '700 128px "Karantina"';
  ctx.fillText(opts.archetype, W / 2, 850);
  ctx.fillStyle = "#bcb3a3";
  ctx.font = '400 40px "Assistant"';
  ctx.fillText(opts.line, W / 2, 920);

  // radar
  const C = { x: W / 2, y: 1330 }, R = 250, n = AXES.length;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [C.x + r * Math.cos(a), C.y + r * Math.sin(a)];
  };
  ctx.lineWidth = 2;
  for (const k of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath();
    AXES.forEach((_, i) => {
      const [x, y] = pt(i, R * k);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.strokeStyle = "rgba(255,238,205,0.09)";
    ctx.stroke();
  }
  ctx.beginPath();
  AXES.forEach((a, i) => {
    const [x, y] = pt(i, R * Math.max(0.06, opts.scores[a.id] / 100));
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = "rgba(226,198,142,0.2)";
  ctx.fill();
  ctx.strokeStyle = "#e2c68e";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.font = '500 34px "Assistant"';
  ctx.fillStyle = "#f4eee3";
  AXES.forEach((a, i) => {
    const [x, y] = pt(i, R + 62);
    ctx.textAlign = "center";
    ctx.fillText(`${a.short} ${opts.scores[a.id]}`, x, y + 12);
  });

  // mascot
  if (opts.mascotSvg) {
    try {
      const xml = new XMLSerializer().serializeToString(opts.mascotSvg);
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
      await img.decode();
      ctx.drawImage(img, 110, 1640, 170, 170);
    } catch {}
  }

  // footer
  ctx.textAlign = "right";
  ctx.fillStyle = "#f4eee3";
  ctx.font = '700 66px "Karantina"';
  ctx.fillText("כמה העסק שלך מקבל?", W - 110, 1715);
  ctx.fillStyle = "#e2c68e";
  ctx.font = '500 34px "Assistant"';
  ctx.fillText("דובדבוט · רנטגן עסקי ב-3 דקות", W - 110, 1772);

  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
