import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";
import ChatClient, { ChatMessage } from "@/components/ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const supabase = db();
  const { data: user } = await supabase.from("users").select("id, full_name, phone, email").eq("id", userId).maybeSingle();
  if (!user) redirect("/");

  const sp = await searchParams;
  let conversationId: string | null = null;
  let messages: ChatMessage[] = [];

  if (!sp.new) {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .gte("updated_at", weekAgo)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (conv) {
      conversationId = conv.id;
      const { data: rows } = await supabase
        .from("messages")
        .select("id, role, content")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true })
        .limit(60);
      messages = (rows ?? []).map((r) => ({ id: r.id, role: r.role as "user" | "assistant", content: r.content }));
    }
  }

  return (
    <ChatClient
      user={{ firstName: user.full_name.split(" ")[0], fullName: user.full_name, phone: user.phone, email: user.email }}
      initialConversationId={conversationId}
      initialMessages={messages}
    />
  );
}
