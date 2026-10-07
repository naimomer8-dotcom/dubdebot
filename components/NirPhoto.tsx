/** Nir's portrait with a gold ring – used at the moments that lead to a meeting with him. */
export default function NirPhoto({ size = 56, full = false, className = "" }: { size?: number; full?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={full ? "/nir.jpg" : "/nir-face.jpg"}
      alt="ניר דובדבני"
      width={size}
      height={size}
      className={`nir-photo ${full ? "full" : ""} ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
