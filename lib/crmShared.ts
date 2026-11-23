/** CRM constants shared by the back-office UI and the server. */
export const CRM_STATUSES = [
  { id: "new", label: "חדש", tone: "cherry" },
  { id: "no_answer", label: "לא ענה", tone: "" },
  { id: "callback", label: "לחזור אליו", tone: "" },
  { id: "scheduled", label: "נקבעה פגישה", tone: "gold" },
  { id: "met", label: "הפגישה התקיימה", tone: "gold" },
  { id: "no_show", label: "לא הגיע לפגישה", tone: "" },
  { id: "sold", label: "נסגרה מכירה", tone: "green" },
  { id: "not_relevant", label: "לא רלוונטי", tone: "" },
] as const;
export type CrmStatus = (typeof CRM_STATUSES)[number]["id"];
export const statusLabel = (s: string) => CRM_STATUSES.find((x) => x.id === s)?.label ?? s;
export const isCrmStatus = (s: unknown): s is CrmStatus => CRM_STATUSES.some((x) => x.id === s);

export const MEETING_LABEL: Record<string, string> = {
  onboarding: "פגישת הטמעה והדרכה",
  advisor: "פגישת יועץ",
  nir: "פגישה עם ניר",
  renewal: "חידוש / מנוי",
  purchase: "רכישה",
};

export const PARTNERS: Record<string, string> = { olmo: "אולמו", nadav: "נדב / מוקד", other: "אחר" };

