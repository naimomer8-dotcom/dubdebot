import { NextResponse } from "next/server";
import { guard } from "@/lib/guard";
import { db } from "@/lib/supabase";
import { clean } from "@/lib/financials";

export const runtime = "nodejs";

/** Save one month of P&L / balance numbers. No AI involved. */
export async function POST(req: Request) {
  const gate = await guard("financials", 120, 60);
  if (gate instanceof Response) return gate;
  const b = await req.json().catch(() => ({}));
  const period = String(b.period ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return NextResponse.json({ error: "חודש לא תקין" }, { status: 400 });
  const data = clean(b.data);
  if (!Object.keys(data).length) return NextResponse.json({ error: "לא הוזנו מספרים" }, { status: 400 });
  const { error } = await db().from("financials").upsert({ user_id: gate, period, data, updated_at: new Date().toISOString() }, { onConflict: "user_id,period" });
  if (error) return NextResponse.json({ error: "db" }, { status: 500 });
  return NextResponse.json({ ok: true, period, data });
}

export async function DELETE(req: Request) {
  const gate = await guard("financials", 120, 60);
  if (gate instanceof Response) return gate;
  const { period } = await req.json().catch(() => ({}));
  await db().from("financials").delete().eq("user_id", gate).eq("period", String(period ?? ""));
  return NextResponse.json({ ok: true });
}
