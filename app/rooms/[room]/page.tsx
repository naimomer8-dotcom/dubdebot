import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUserId } from "@/lib/session";
import { loadShell } from "@/lib/data";
import { roomById } from "@/lib/rooms";
import ExpiredScreen from "@/components/ExpiredScreen";
import ConsentGate from "@/components/ConsentGate";
import { RoomClient } from "@/components/Rooms";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ room: string }> }): Promise<Metadata> {
  const r = roomById((await params).room);
  return { title: r ? `חדר ה${r.title} | Duvdevani Platform` : "Duvdevani Platform" };
}

export default async function RoomPage({ params }: { params: Promise<{ room: string }> }) {
  const room = roomById((await params).room);
  if (!room) notFound();
  if (room.id === "courses") redirect("/courses");
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const shell = await loadShell(userId);
  if (!shell) redirect("/");
  if (!shell.user.consent) return <ConsentGate firstName={shell.user.firstName} />;
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;
  return <RoomClient room={room} user={shell.user} conversations={shell.conversations} />;
}
