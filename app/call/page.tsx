import type { Metadata } from "next";
import CallbackForm from "@/components/CallbackForm";

export const metadata: Metadata = { title: "שיחת 5 דקות | Duvdevani Platform", description: "משאירים פרטים, ונציג של ניר חוזר אליכם לשיחה קצרה: איזה מסלול מתאים לעסק שלכם." };

export default async function CallPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return <CallbackForm source={(sp.utm_source ?? "").slice(0, 40)} />;
}
