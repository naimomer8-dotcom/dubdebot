import Landing from "@/components/Landing";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  let loggedIn = false;
  try {
    loggedIn = !!(await getSessionUserId());
  } catch {
    loggedIn = false;
  }
  return <Landing loggedIn={loggedIn} />;
}
