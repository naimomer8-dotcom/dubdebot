"use client";

import Link from "next/link";
import Mascot from "./Mascot";

export function GroupLogo({ className = "group-logo" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo-duvdevani-white.png" alt="קבוצת דובדבני" className={className} />;
}

export default function BrandBar() {
  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">
        <Mascot size={44} />
        <b className="gold">דובדבוט</b>
      </Link>
      <GroupLogo />
    </nav>
  );
}
