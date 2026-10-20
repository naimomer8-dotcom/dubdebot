/**
 * The bot's "AI core": a small gold orb with a living ring.
 * idle = slow breathing, thinking = fast orbit and pulse, answering = bright core with ripples.
 * Pure CSS (see .core in globals.css), so it costs nothing on mobile and stops under prefers-reduced-motion.
 */
export type CoreState = "idle" | "thinking" | "answering";

export default function AiCore({ size = 40, state = "idle", label }: { size?: number; state?: CoreState; label?: string }) {
  return (
    <span
      className={`core core-${state}`}
      style={{ "--s": `${size}px` } as React.CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="core-halo" />
      <span className="core-ring" />
      <span className="core-orbit"><i /><i /></span>
      <span className="core-ball"><span className="core-swirl" /></span>
      <span className="core-ripple" />
      <span className="core-ripple r2" />
    </span>
  );
}
