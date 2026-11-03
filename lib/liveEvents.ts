/** Live events offered to every member in the app popup: the sales workshop (gift) and the next webinar. */
export const WORKSHOP_GIFT = {
  title: "סדנת מכירות: פשוט למכור יותר",
  sub: "4 שעות פרונטליות עם ניר, במתנה",
  date: "2026-11-15",
  dateLabel: "יום ראשון 15.11",
  time: "התכנסות 9:00 · 10:00 עד 14:00",
  place: "מרכז ניר דובדבני, הנגב 2, איירפורט סיטי",
};

export type LiveEventKey = "workshop" | "webinar";
export const LIVE_EVENT_TYPE: Record<LiveEventKey, string> = { workshop: "reg:workshop", webinar: "reg:webinar" };

const ilToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
/** The workshop seat is offered until the day itself. */
export const workshopOpen = () => ilToday() <= WORKSHOP_GIFT.date;
