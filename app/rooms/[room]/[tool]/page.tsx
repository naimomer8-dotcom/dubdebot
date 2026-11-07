import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import { loadShell } from "@/lib/data";
import ExpiredScreen from "@/components/ExpiredScreen";
import ConsentGate from "@/components/ConsentGate";
import RoomToolPage from "@/components/RoomTools";
import { ROOM_TOOLS, type ToolId } from "@/lib/roomTools";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const t = ROOM_TOOLS[(await params).tool];
  return { title: t ? `${t.title} | Duvdevani Platform` : "Duvdevani Platform" };
}

export default async function ToolPage({ params }: { params: Promise<{ room: string; tool: string }> }) {
  const { room, tool } = await params;
  const t = ROOM_TOOLS[tool];
  if (!t || t.room !== room) notFound();
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const shell = await loadShell(userId);
  if (!shell) redirect("/");
  if (!shell.user.consent) return <ConsentGate firstName={shell.user.firstName} />;
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  return <RoomToolPage tool={tool as ToolId} user={shell.user} conversations={shell.conversations} />;
}
