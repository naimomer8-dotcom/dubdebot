"use client";

import Spotlight from "./Spotlight";
import { Brand } from "./BrandBar";
import RenewalPanel from "./RenewalPanel";
import Link from "next/link";
import type { ShellUser } from "@/lib/data";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";

/** Full-page lock shown instead of the app once the subscription has ended. */
export default function ExpiredScreen({ user }: { user: ShellUser }) {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    window.location.href = "/";
  }
  return (
    <>
      <Spotlight />
      <div className="xr">
        <header className="xr-top">
          <Brand sub={false} size={34} />
          <span />
          <button className="btn btn-ghost btn-sm" onClick={logout}>יציאה</button>
        </header>
        <main className="xr-stage" style={{ flexDirection: "column", gap: 18 }}>
          <div className="plans-note" style={{ maxWidth: 560 }}>
            <span>כל השיחות והתיק העסקי שלך שמורים. בוחרים מסלול, והכל נפתח מאיפה שעצרת.</span>
            <Link href="/plans" className="btn btn-primary btn-sm" style={{ marginInlineStart: "auto" }}>לבחירת מסלול</Link>
          </div>
          <RenewalPanel access={user.access} firstName={user.firstName} phone={user.phone} />
        </main>
        <p className="rep-note" style={{ textAlign: "center", padding: "0 16px 24px" }}>{DISCLAIMER_SHORT}</p>
      </div>
    </>
  );
}
