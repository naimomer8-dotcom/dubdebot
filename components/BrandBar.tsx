"use client";

import Link from "next/link";
import Mascot from "./Mascot";

export function GroupLogo({ className = "group-logo" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-duvdevani-white.png" alt="קבוצת דובדבני" className={className} />;
}

export function Brand({ size = 38, sub = true, href = "/" }: { size?: number; sub?: boolean; href?: string }) {
  return (
    <Link href={href} className="brand" aria-label="דובדבוט – דף הבית">
      <Mascot size={size} />
      <span>
        <b>דובדבוט</b>
        {sub && <small>BY DUVDEVANI GROUP</small>}
      </span>
    </Link>
  );
}

export default function BrandBar() {
  return (
    <nav className="topnav scrolled">
      <div className="topnav-in">
        <Brand />
        <GroupLogo />
      </div>
    </nav>
  );
}
