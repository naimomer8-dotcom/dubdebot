import type { Metadata } from "next";
import ConsentGate from "@/components/ConsentGate";
import { consentPending } from "@/lib/consent";
import { getSessionUserId } from "@/lib/session";
import { loadShell } from "@/lib/data";
import PlansClient from "@/components/PlansClient";
import { offersFor } from "@/lib/offers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "מסלולים | Duvdevani Platform", description: "Platform Basic, Private, Upgrade ו-Pro: כל הקורסים של ניר, הסדנה הרבעונית \"להעיר את הכסף שבך\", זום עם ניר וליווי אישי." };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ up?: string; buy?: string; billing?: string }> }) {
  const userId = await getSessionUserId();
  if (await consentPending(userId)) return <ConsentGate />;
  const shell = userId ? await loadShell(userId) : null;
  const sp = await searchParams;
  const offers = userId ? await offersFor(userId) : {};
  return <PlansClient user={shell?.user ?? null} conversations={shell?.conversations ?? []} focus={sp.up ?? null} offers={offers} autoBuy={sp.buy === "1"} initialBilling={sp.billing === "installments" ? "installments" : "onetime"} />;
}
