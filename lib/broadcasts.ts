/**
 * One-off broadcasts to everyone who agreed to marketing (sent by /api/cron/broadcasts on `date`, Israel time).
 * Email only (Rav Messer, through the same Make flow as the journeys): the WhatsApp leg needs its own
 * approved template. Nothing goes out until `approved` is true. Each person gets each broadcast once.
 */
export type Broadcast = { key: string; date: string; approved: boolean; subject: string; text: string; link: string };

export const BROADCASTS: Broadcast[] = [
  {
    key: "b_events_1511",
    date: "2026-11-05",
    approved: false,
    subject: "15.11: בבוקר סדנה איתי, בערב לייב. שמרתי לך מקום",
    link: "/home?events=1&utm_source=email&utm_medium=broadcast&utm_campaign=events_1511",
    text: [
      "{{first_name}}, יום ראשון 15.11 הוא יום שלם של עבודה על העסק שלך, ואני רוצה אותך בשני החלקים.",
      "",
      "בבוקר: סדנת מכירות \"פשוט למכור יותר\". 4 שעות פרונטליות איתי, במתנה למשתמשי הפלטפורמה. 10:00 עד 14:00 (התכנסות ב-9:00), מרכז ניר דובדבני, הנגב 2, איירפורט סיטי.",
      "",
      "בערב: וובינר חי \"מנועי צמיחה לעסק שלך לשנת 2027\", ב-21:00 בזום. ששת המנועים שאני בונה עם עסקים לשנה הבאה, ושאלות ותשובות בלייב.",
      "",
      "ההרשמה בלחיצה אחת: נכנסים לאפליקציה, ובחלון שנפתח מסמנים סדנה, וובינר או את שניהם.",
      "",
      "נתראה ב-15.11,",
      "ניר",
    ].join("\n"),
  },
];
