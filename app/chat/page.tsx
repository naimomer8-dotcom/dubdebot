import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";
import { loadShell } from "@/lib/data";
import { TOOLS, ToolMode } from "@/lib/persona";
import ExpiredScreen from "@/components/ExpiredScreen";
import ChatClient, { ChatAttachment, ChatMessage } from "@/components/ChatClient";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ new?: string; c?: string; tool?: string; xray?: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const shell = await loadShell(userId);
  if (!shell) redirect("/");
  if (shell.user.access.status === "expired") return <ExpiredScreen user={shell.user} />;

  const sp = await searchParams;
  const supabase = db();
  let conversationId: string | null = null;
  let messages: ChatMessage[] = [];
  const fresh = !!sp.new || !!sp.tool || !!sp.xray;

  if (sp.c) {
    const { data } = await supabase.from("conversations").select("id").eq("id", sp.c).eq("user_id", userId).maybeSingle();
    conversationId = data?.id ?? null;
  } else if (!fresh) {
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const recent = shell.conversations.find((c) => c.updated_at >= weekAgo);
    conversationId = recent?.id ?? null;
  }

  if (conversationId) {
    const [{ data: rows }, { data: saved }] = await Promise.all([
      supabase.from("messages").select("id, role, content, attachments").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(80),
      supabase.from("deliverables").select("message_id").eq("user_id", userId),
    ]);
    const savedIds = new Set((saved ?? []).map((s) => s.message_id));
    messages = (rows ?? []).map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      content: r.content,
      saved: savedIds.has(r.id),
      attachments: ((r.attachments as ChatAttachment[] | null) ?? []).map((a) => ({ name: a.name, kind: a.kind })),
    }));
  }

  const tool = sp.tool && (TOOLS.some((t) => t.id === sp.tool) || ["call", "upload", "scan", "xray"].includes(sp.tool)) ? (sp.tool as ToolMode) : null;

  return (
    <ChatClient
      user={shell.user}
      conversations={shell.conversations}
      leadSentInitially={shell.leadSent}
      initialConversationId={conversationId}
      initialMessages={messages}
      initialTool={tool}
      autoXray={!!sp.xray}
    />
  );
}
