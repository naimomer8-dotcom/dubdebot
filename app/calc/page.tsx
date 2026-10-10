import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import Spotlight from "@/components/Spotlight";
import Icon from "@/components/Icon";
import { Brand } from "@/components/BrandBar";
import Calculators from "@/components/Calculators";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "מחשבונים עסקיים | דובדבוט" };

export default async function CalcPage() {
  if (!(await getSessionUserId())) redirect("/login");
  return (
    <>
      <Spotlight />
      <div className="xr">
        <header className="xr-top">
          <Brand sub={false} size={34} />
          <span />
          <Link href="/chat" className="icon-btn" aria-label="סגירה"><Icon name="close" size={20} /></Link>
        </header>
        <main className="xr-stage">
          <div className="tests">
            <span className="eyebrow">מחשבונים</span>
            <h1 className="h-display">המספרים לא משקרים. <span className="gold">תבדוק לפני שאתה מחליט.</span></h1>
            <p className="lead" style={{ margin: 0 }}>נקודת איזון, תמחור, מבצעים, ערך לקוח ומע״מ – תוצאה מיידית.</p>
            <Calculators />
          </div>
        </main>
      </div>
    </>
  );
}
