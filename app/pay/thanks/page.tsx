import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { settleCardcomOrder } from "@/lib/cardcomOrders";
import { planById, ils } from "@/lib/plans";
import Confetti from "@/components/Confetti";
import NirPose from "@/components/NirPose";
import Icon from "@/components/Icon";
import PayPending from "@/components/PayPending";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "תודה! | Duvdevani Platform", robots: { index: false }, referrer: "no-referrer" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Thanks({ searchParams }: { searchParams: Promise<{ o?: string }> }) {
  const sp = await searchParams;
  const orderId = String(sp.o ?? "");
  const userId = await getSessionUserId();
  if (!userId) redirect(`/login?next=${encodeURIComponent(`/pay/thanks?o=${orderId}`)}`);
  if (!UUID.test(orderId)) redirect("/plans");

  const supabase = db();
  const { data: order } = await supabase.from("orders").select("id, user_id, tier, billing, status, amount_total, num_payments, installments, doc_number, doc_url, customer_email").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== userId) redirect("/plans");

  // never open access from the redirect itself: confirm with Cardcom server-to-server
  let status = order.status as string;
  if (status !== "paid") status = (await settleCardcomOrder(orderId).catch(() => ({ status: "pending" as const }))).status;
  if (status === "failed") redirect(`/pay/failed?o=${orderId}`);

  const { data: fresh } = await supabase.from("orders").select("doc_number, doc_url, num_payments").eq("id", orderId).maybeSingle();
  const { data: u } = await supabase.from("users").select("full_name, email, access_until").eq("id", userId).maybeSingle();
  const first = String(u?.full_name ?? "").split(" ")[0] || "חבר";
  const plan = planById(order.tier);
  const payments = fresh?.num_payments ?? order.installments ?? 1;
  const meeting = order.tier !== "basic";
  const paid = status === "paid";

  return (
    <main className="pay-page" dir="rtl">
      {paid && <Confetti />}
      <section className="pay-card glass edge">
        <div className="pay-art"><NirPose pose={paid ? "celebrate" : "hourglass"} width={210} eager /></div>
        <div className="pay-body">
          <span className="eyebrow">{plan?.name ?? "Duvdevani Platform"} · {paid ? "התשלום התקבל" : "רגע אחד"}</span>
          {paid ? (
            <h1 className="h-display pay-h">בשעה טובה, {first}! <span className="gold">אתה בפנים.</span></h1>
          ) : (
            <h1 className="h-display pay-h">כמעט שם, {first}.</h1>
          )}
          {!paid && <PayPending />}

          {paid && (
            <>
              <div className="pay-receipt" aria-label="פרטי התשלום">
                <div><small>מסלול</small><b>{plan?.name ?? order.tier}</b></div>
                <div><small>סכום</small><b className="num">{ils(Number(order.amount_total), 2)}</b><small>כולל מע״מ{payments > 1 ? ` · ${payments} תשלומים` : " · תשלום אחד"}</small></div>
                <div><small>מנוי פעיל עד</small><b className="num">{u?.access_until ? new Date(u.access_until).toLocaleDateString("he-IL") : "-"}</b></div>
              </div>

              <p className="pay-invoice">
                <Icon name="mail" size={16} />
                <span>
                  חשבונית מס/קבלה{fresh?.doc_number ? ` מס׳ ${fresh.doc_number}` : ""} נשלחה אל <b dir="ltr">{order.customer_email ?? u?.email}</b>
                  {fresh?.doc_url && <> · <a href={fresh.doc_url} target="_blank" rel="noopener noreferrer">לצפייה בחשבונית</a></>}
                </span>
              </p>

              <ol className="pay-steps">
                <li><span className="tl-ico"><Icon name="layers" size={18} /></span><span><b>הקורסים והספרים נפתחו לך</b><small>הכל מחכה בעמוד &quot;הקורסים שלי&quot;, בלחיצה אחת.</small></span></li>
                <li><span className="tl-ico"><Icon name="chat" size={18} /></span><span><b>דובדבוט איתך 24/6</b><small>שאלה על תמחור, מכירות או תזרים? פשוט לכתוב.</small></span></li>
                <li><span className="tl-ico"><Icon name="calendar" size={18} /></span><span><b>הסדנה &quot;להעיר את הכסף שבך&quot; והזום החודשי עם ניר</b><small>ההזמנות יגיעו אליך בוואטסאפ ובמייל.</small></span></li>
                {meeting && <li><span className="tl-ico"><Icon name="phone" size={18} /></span><span><b>נציג יחזור אליך תוך 24 שעות</b><small>לתאם את הליווי האישי שכלול במסלול שלך.</small></span></li>}
              </ol>

              <div className="pay-actions">
                <Link className="btn btn-primary" href="/courses">לקורסים שלי <Icon name="arrowLeft" size={18} className="ico-move" /></Link>
                <Link className="btn btn-ghost" href="/">לשיחה עם דובדבוט</Link>
              </div>
            </>
          )}
        </div>
      </section>
      <p className="pay-foot">שאלה על התשלום? כותבים לנו ל-<a href="mailto:info@rnd.org.il">info@rnd.org.il</a></p>
    </main>
  );
}
