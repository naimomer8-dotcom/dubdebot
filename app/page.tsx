import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

export default async function Home() {
  // members go straight to the app – the landing page is only the gate
  if (await getSessionUserId()) redirect("/chat");
  return <Landing />;
}
