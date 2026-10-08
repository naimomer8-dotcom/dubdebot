import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import Spotlight from "@/components/Spotlight";
import Icon from "@/components/Icon";
import { Brand } from "@/components/BrandBar";
import { QUIZZES } from "@/lib/quizzes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "מבחנים | דובדבוט" };

const ALL = [
  { href: "/xray", title: "רנטגן עסקי", sub: "12 השאלות שניר שואל בפגישה הראשונה – ציון על 6 צירים", minutes: 3, icon: "scan" as const },
  { href: "/tests/disc", title: QUIZZES.disc.title, sub: QUIZZES.disc.sub, minutes: QUIZZES.disc.minutes, icon: "user" as const },
  { href: "/tests/sales", title: QUIZZES.sales.title, sub: QUIZZES.sales.sub, minutes: QUIZZES.sales.minutes, icon: "target" as const },
];

export default async function Tests() {
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
            <span className="eyebrow">מבחנים</span>
            <h1 className="h-display">תכיר את עצמך. <span className="gold">ואז תשנה.</span></h1>
            <p className="lead" style={{ margin: 0 }}>3 דקות כל מבחן. התוצאה נשמרת בתיק, ודובדבוט מתאים את הייעוץ אליך.</p>
            <div className="tests-grid">
              {ALL.map((t) => (
                <Link key={t.href} href={t.href} className="feat glass edge">
                  <span className="feat-ico"><Icon name={t.icon} size={22} /></span>
                  <span className="feat-body"><b>{t.title}</b><span>{t.sub}</span></span>
                  <span className="feat-lock"><Icon name="clock" size={14} /> {t.minutes} דקות</span>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
