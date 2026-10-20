import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { loadShell } from "@/lib/data";
import { offersFor } from "@/lib/offers";
import { planById, priceOf, ils, type Tier } from "@/lib/plans";
import { PLAN_PAGES, carried } from "@/lib/planPages";
import PlanLanding from "@/components/PlanLanding";

export const dynamic = "force-dynamic";

const APP = process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ plan: string }> }): Promise<Metadata> {
  const { plan } = await params;
  const p = planById(plan);
  if (!p) return { title: "מסלולים | Duvdevani Platform" };
  const page = PLAN_PAGES[p.id];
  const from = priceOf(p.id, "onetime").perMonthNet;
  const title = `${p.name} | Duvdevani Platform`;
  const description = `${page.og} מ-${ils(from)} לחודש, לא כולל מע״מ.`;
  const image = { url: `${APP}/og/plan-${p.id}.jpg`, width: 1200, height: 630, alt: `${p.name} · Duvdevani Platform` };
  return {
    title,
    description,
    alternates: { canonical: `${APP}/plans/${p.id}` },
    openGraph: { title, description, url: `${APP}/plans/${p.id}`, siteName: "Duvdevani Platform", locale: "he_IL", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function PlanPage({ params, searchParams }: { params: Promise<{ plan: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { plan } = await params;
  const p = planById(plan);
  if (!p) notFound();
  const userId = await getSessionUserId();
  const shell = userId ? await loadShell(userId) : null;
  const offers = userId ? await offersFor(userId) : {};
  const owned = shell?.user.access.plan === "paid" ? (shell.user.access.tier as Tier | null) : null;
  return <PlanLanding tier={p.id} signedIn={!!shell} firstName={shell?.user.firstName ?? null} owned={owned} offers={offers} passParams={carried(await searchParams)} />;
}
