"use client";

import Link from "next/link";
import Icon from "./Icon";
import { nextTier, planById, priceOf, ils } from "@/lib/plans";
import type { Access } from "@/lib/session";

/** Always-on subscription strip at the top of the app: the gift countdown + the best next plan. */
export default function PlanCube({ access, compact = false }: { access: Access; compact?: boolean }) {
  const up = nextTier(access.tier);
  if (!up || access.status === "expired") return <div className="plan-cube-slot" />;
  const trial = access.plan !== "paid";
  const basicMonthly = priceOf("basic", "onetime").perMonthNet;
  const mine = planById(access.tier);
  return (
    <div className={`plan-cube ${compact ? "compact" : ""} ${trial && access.daysLeft <= 7 ? "urgent" : ""}`} role="region" aria-label="מנוי">
      <span className="pc-ico" aria-hidden="true"><Icon name={trial ? "clock" : "gem"} size={16} /></span>
      <span className="pc-text">
        {trial ? (
          <>
            <b>{access.daysLeft <= 1 ? "היום האחרון במתנה" : `עוד ${access.daysLeft} ימים במתנה`}</b>
            <span className="pc-sub"> · Alpha Basic: כל הקורסים, כנס רבעוני וזום עם ניר · מ-{ils(basicMonthly)} לחודש + מע״מ</span>
          </>
        ) : (
          <>
            <b>{mine?.name}</b>
            <span className="pc-sub"> · שדרוג ל-{up.name}: {up.tagline}</span>
          </>
        )}
      </span>
      <Link href={`/plans${trial ? "" : `?up=${up.id}`}`} className="btn btn-primary btn-sm pc-btn">
        {trial ? "לבחירת מסלול" : "לשדרוג"}
      </Link>
    </div>
  );
}
