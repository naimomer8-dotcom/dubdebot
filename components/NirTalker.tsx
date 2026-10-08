/**
 * Nir's real photo with a light jaw animation driven by the voice level (0–1).
 * Three layers: the face, a dark mouth cavity under the lip line, and the jaw (masked) that drops while he talks.
 */
export default function NirTalker({ level = 0, size = 230, state = "idle" }: { level?: number; size?: number; state?: "idle" | "speaking" | "listening" | "thinking" }) {
  const open = state === "speaking" ? Math.min(1, Math.max(0, (level - 0.04) * 1.6)) : 0;
  return (
    <div className={`talker talker--${state}`} style={{ width: size, height: size, ["--open" as string]: open.toFixed(3) }} role="img" aria-label="ניר דובדבני מדבר">
      <div className="talker-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="talker-face" src="/nir/talk-face.jpg" alt="" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="talker-mouth" src="/nir/talk-mouth.png" alt="" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="talker-jaw" src="/nir/talk-face.jpg" alt="" draggable={false} />
      </div>
    </div>
  );
}
