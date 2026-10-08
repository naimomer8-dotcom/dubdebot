export type Pose = "point-down" | "suit-point" | "celebrate" | "alarm" | "hourglass" | "leads" | "book" | "welcome" | "thanks" | "wheel" | "box";

const ALT: Record<Pose, string> = {
  "point-down": "ניר דובדבני מצביע למטה",
  "suit-point": "ניר דובדבני מצביע למטה",
  celebrate: "ניר דובדבני חוגג",
  alarm: "ניר דובדבני עם שעון מעורר",
  hourglass: "ניר דובדבני עם שעון חול",
  leads: "ניר דובדבני עם החוברת מכונת לידים",
  book: "ניר דובדבני עם הספר שלו",
  welcome: "ניר דובדבני מקבל אותך בידיים פתוחות",
  thanks: "ניר דובדבני מודה",
  wheel: "ניר דובדבני עם גלגל דובדבן המזל",
  box: "ניר דובדבני עם ה-BOX",
};

/** Cut-out photo of Nir in a pose that matches the moment. */
export default function NirPose({ pose, width = 220, className = "", eager = false }: { pose: Pose; width?: number; className?: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/nir/${pose}.webp`}
      alt={ALT[pose]}
      className={`nir-pose ${className}`}
      style={{ width }}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
    />
  );
}
