import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { planById } from "@/lib/plans";
import NirPose from "@/components/NirPose";
import Icon from "@/components/Icon";
import PayRepButton from "@/components/PayRepButton";
import { REP_NAME, repWhatsApp } from "@/lib/platform";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "התשלום לא הושלם | Duvdevani Platform", robots: { index: false }, referrer: "no-referrer" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Failed({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  const sp = await searchParams;
  const orderId = String(sp.o ?? "");
  const userId = await getSessionUserId();
  let tier: string | null = null;
  let billing: string | null = null;
  if (userId && UUID.test(orderId)) {
    const { data } = await db().from("orders").select("user_id, tier, billing").eq("id", orderId).maybeSingle();
    if (data?.user_id === userId) { tier = data.tier; billing = data.billing; }
  }
  const plan = planById(tier);
  const retry = tier ? `/plans?up=${tier}&buy=1${billing === "installments" ? "&billing=installments" : ""}` : "/plans";
  return (
    <main className="pay-page" dir="rtl">
      <section className="pay-card glass edge">
        <div className="pay-art"><NirPose pose="hourglass" width={190} eager /></div>
        <div className="pay-body">
          <span className="eyebrow">{plan?.name ?? "Duvdevani Platform"} · התשלום לא הושלם</span>
          <h1 className="h-display pay-h">לא נורא, <span className="gold">זה קורה.</span></h1>
          <p className="lead pay-lead">הכרטיס לא חויב. לרוב זו בעיה קטנה: פרט שהוקלד לא נכון, מסגרת אשראי או אישור של חברת האשראי שלא הגיע.</p>
          <ul className="pay-steps">
            <li><span className="tl-ico"><Icon name="check" size={18} /></span><span><b>לבדוק את פרטי הכרטיס</b><small>מספר, תוקף, 3 ספרות בגב ותעודת זהות של בעל הכרטיס.</small></span></li>
            <li><span className="tl-ico"><Icon name="lock" size={18} /></span><span><b>לנסות כרטיס אחר</b><small>התשלום מאובטח בדף של קארדקום. הפרטים לא נשמרים אצלנו.</small></span></li>
            <li><span className="tl-ico"><Icon name="phone" size={18} /></span><span><b>להעדיף שנציג יסגור איתך?</b><small>נחזור אליך תוך 24 שעות עם קישור תשלום.</small></span></li>
          </ul>
          <div className="pay-actions">
            <Link className="btn btn-primary" href={retry}>לנסות שוב <Icon name="arrowLeft" size={18} className="ico-move" /></Link>
            {tier && <PayRepButton tier={tier} billing={billing === "installments" ? "installments" : "onetime"} />}
            <a className="btn btn-ghost" href={repWhatsApp(plan?.name)} target="_blank" rel="noreferrer">וואטסאפ ל{REP_NAME}</a>
          </div>
        </div>
      </section>
      <p className="pay-foot">שאלה על התשלום? כותבים לנו ל-<a href="mailto:info@rnd.org.il">info@rnd.org.il</a></p>
    </main>
  );
}
