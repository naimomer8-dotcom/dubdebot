import { notFound } from "next/navigation";
import { RoomClient } from "@/components/Rooms";
import CampaignBuilder from "@/components/CampaignBuilder";
import { roomById } from "@/lib/rooms";

// Design preview with sample data. Disabled in production.
export default async function PreviewRooms({ searchParams }: { searchParams: Promise<{ r?: string; step?: string; empty?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const user = { id: "preview", firstName: "מיכל", fullName: "מיכל כהן", phone: "0501234567", email: "michal@example.com", access: { status: "trial" as const, plan: "trial" as const, accessUntil: new Date(Date.now() + 20 * 864e5).toISOString(), daysLeft: 20, renewalRequestedAt: null, tier: null, renewalMode: "none" } };
  if (sp.r === "campaign") {
    const c = {
      audience: { who: "אמהות בנות 28 עד 40 אחרי לידה שרוצות לחזור לכושר בלי לעזוב את הבית לשעות.", pains: ["אין לי זמן לעצמי", "הבגדים כבר לא עולים", "ניסיתי חדר כושר ונשברתי אחרי שבועיים"], desires: ["להרגיש שוב חזקה", "אימון קצר שמתאים לתינוק", "מישהי שתחזיק אותי במסגרת"], objections: ["אין לי כסף לזה עכשיו", "אני לא אתמיד", "אני לא בכושר בשביל אימון"], targeting: ["אמהות לתינוקות", "כושר נשים", "פילאטיס", "הורות", "תל אביב והסביבה"], angle: "30 דקות ביום שמחזירות לך את עצמך, עם התינוק לידך." },
      ads: [
        { name: "כאב", hook: "מתי בפעם האחרונה עשית משהו רק בשבילך?", body: "אחרי לידה הכל סובב סביב התינוק.\nהגוף מחכה. הראש עייף.\n30 דקות, 3 פעמים בשבוע, מהסלון שלך.", cta: "לאימון ניסיון ב-49 ₪", headline: "חוזרות לעצמן ב-30 דקות", sub: "אימון אישי לאמהות, מהסלון, עם התינוק לידך" },
        { name: "תוצאה", hook: "3 חודשים, 6 קילו, ואנרגיה שלא הייתה מאז ההריון", body: "ככה נראה תהליך של אמא שמתאמנת איתי.\nבלי דיאטות מטורפות.\nרק תוכנית קצרה ומסגרת.", cta: "לשיחת היכרות", headline: "האנרגיה חוזרת", sub: "תוכנית של 12 שבועות לאמהות אחרי לידה" },
        { name: "סיפור", hook: "גם אני הייתי שם, עם תינוקת ובלי שעה לעצמי", body: "בניתי את האימונים בשביל עצמי.\nהיום אני מאמנת 40 אמהות.\nבואי להיות הבאה.", cta: "שלחי לי הודעה", headline: "גם אני הייתי שם", sub: "ובניתי את האימונים שהייתי צריכה" },
      ],
      script: { title: "30 שניות: למה אין לך זמן", tip: "צלמו ליד חלון, באור יום, והטלפון בגובה העיניים.", shots: [
        { t: "0-3", see: "את מחזיקה את התינוק ומסתכלת למצלמה", say: "אין לך זמן לאימון? גם לי לא היה.", text: "אין לך זמן?" },
        { t: "3-10", see: "שעון על 30 דקות, מזרון בסלון", say: "אז בניתי אימון של 30 דקות שעושים מהבית.", text: "30 דקות" },
        { t: "10-20", see: "קטע מאימון, התינוק על שטיח לידך", say: "התינוק לידך, ואת סוף סוף עושה משהו בשבילך.", text: "בשבילך" },
        { t: "20-26", see: "את מחייכת אחרי אימון", say: "אחרי חודש את מרגישה אחרת.", text: "חודש אחד" },
        { t: "26-30", see: "פנים למצלמה", say: "אימון ניסיון ב-49 שקל. הקישור למטה.", text: "49 ₪ לניסיון" },
      ] },
    };
    return <CampaignBuilder user={user} conversations={[]} initial={sp.empty ? null : c} initialStep={(Number(sp.step) || 1) as 1 | 2 | 3 | 4} />;
  }
  const room = roomById(sp.r ?? "marketing") ?? roomById("marketing")!;
  return <RoomClient room={room} user={user} conversations={[]} />;
}
