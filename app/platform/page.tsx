import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import PlatformPage from "@/components/PlatformPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "הפלטפורמה להצלחה בעסקים | ניר דובדבני",
  description: "פלטפורמה היברידית ואקטיבית לבעלי עסקים, על בסיס שיטת האלפא של ניר דובדבני: דובדבוט 24/6, קורסים דיגיטליים, הסדנה \"להעיר את הכסף שבך\" פעם ברבעון ופגישה אסטרטגית חודשית בזום.",
};

export default async function Page() {
  return <PlatformPage signedIn={!!(await getSessionUserId())} />;
}
