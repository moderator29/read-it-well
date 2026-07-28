import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { ConversationList } from "@/components/app/messages/ConversationList";
import { getMessageRepository } from "@/lib/messages/repository";

export const metadata: Metadata = { title: "Messages" };

/**
 * Messages: the guest's conversations with agents.
 *
 * Thin server shell over the message repository; the client list owns read
 * state. Each row opens its thread, where the listing options sheet carries
 * the verification and inspection step.
 */
export default async function MessagesPage() {
  const conversations = await getMessageRepository().conversations();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Messages" subtitle="Chat with agents about their listings" />
      <ConversationList conversations={conversations} />
    </div>
  );
}
