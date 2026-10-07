import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import ScanClient from "@/components/ScanClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "סריקת רשתות חברתיות | דובדבוט" };

export default async function ScanPage() {
  if (!(await getSessionUserId())) redirect("/login?next=scan");
  return <ScanClient />;
}
