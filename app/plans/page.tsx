import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import { loadShell } from "@/lib/data";
import PlansClient from "@/components/PlansClient";
import { offersFor } from "@/lib/offers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "מסלולים | Duvdevani Platform", description: "Alpha Basic, Private, Upgrade ו-Pro: כל הקורסים של ניר, כנסים, זום עם ניר וליווי אישי." };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ up?: string }> }) {
  const userId = await getSessionUserId();
  const shell = userId ? await loadShell(userId) : null;
  const sp = await searchParams;
  const offers = userId ? await offersFor(userId) : {};
  return <PlansClient user={shell?.user ?? null} conversations={shell?.conversations ?? []} focus={sp.up ?? null} offers={offers} />;
}
