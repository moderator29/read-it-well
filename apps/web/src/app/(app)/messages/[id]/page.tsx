import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageThread } from "@/components/app/messages/MessageThread";
import { getMessageRepository } from "@/lib/messages/repository";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const thread = await getMessageRepository().conversation(id);
  return { title: thread?.agentName ?? "Conversation" };
}

/**
 * A single conversation thread.
 *
 * Thin server shell: resolves the conversation by id and hands the client
 * thread component the data. Unknown ids fall through to not-found rather
 * than rendering an empty shell.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await getMessageRepository().conversation(id);
  if (!thread) notFound();

  return <MessageThread thread={thread} />;
}
