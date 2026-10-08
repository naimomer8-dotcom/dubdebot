"use client";

import Spotlight from "./Spotlight";
import { Brand } from "./BrandBar";
import RenewalPanel from "./RenewalPanel";
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
        <main className="xr-stage">
          <RenewalPanel access={user.access} firstName={user.firstName} phone={user.phone} />
        </main>
        <p className="rep-note" style={{ textAlign: "center", padding: "0 16px 24px" }}>{DISCLAIMER_SHORT}</p>
      </div>
    </>
  );
}
