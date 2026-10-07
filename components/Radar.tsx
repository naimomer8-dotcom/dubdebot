import { AXES, Scores } from "@/lib/xray";

/** Hexagonal radar of the six business axes. Pure SVG, server-safe. */
export default function Radar({ scores, labels = true, className = "radar" }: { scores: Scores; labels?: boolean; className?: string }) {
  const C = 200;
  const R = 140;
  const n = AXES.length;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const pt = (i: number, rad: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [r1(C + rad * Math.cos(a)), r1(C + rad * Math.sin(a))] as const;
  };
  const ring = (k: number) => AXES.map((_, i) => pt(i, R * k).join(",")).join(" ");
  const shape = AXES.map((a, i) => pt(i, R * Math.max(0.06, (scores[a.id] ?? 0) / 100)).join(",")).join(" ");

  return (
    <svg className={className} viewBox="0 0 400 400" role="img" aria-label={AXES.map((a) => `${a.label} ${scores[a.id]}`).join(", ")}>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} className="grid" points={ring(k)} />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} className="spoke" x1={C} y1={C} x2={x} y2={y} />;
      })}
      <polygon className="shape" points={shape} />
      {AXES.map((a, i) => {
        const [x, y] = pt(i, R * Math.max(0.06, (scores[a.id] ?? 0) / 100));
        return <circle key={a.id} className="pt" cx={x} cy={y} r={3.2} />;
      })}
      {labels &&
        AXES.map((a, i) => {
          const [x, y] = pt(i, R + 30);
          return (
            <text key={a.id} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
              {a.short} · {scores[a.id] ?? 0}
            </text>
          );
        })}
    </svg>
  );
}
