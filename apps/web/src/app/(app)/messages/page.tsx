import type { Metadata } from "next";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { ConversationList } from "@/components/app/messages/ConversationList";
import { resolveSession } from "@/lib/actions/session";
import { isFeatureEnabled } from "@/lib/flags";
import { loadConversationSummaries } from "@/lib/messages/live";
import { getMessageRepository } from "@/lib/messages/repository";
import { LiveThreadList } from "./LiveThreadList";

export const metadata: Metadata = { title: "Messages" };

/**
 * Messages: the guest's conversations with agents.
 *
 * Signed in on a configured platform, the list is the caller's real
 * conversations under RLS, ordered by latest activity with unread counts from
 * the database. Otherwise the seeded threads carry the surface exactly as
 * before, with device-local read state.
 */
export default async function MessagesPage() {
  const session = await resolveSession();

  if (session.state === "signed-in") {
    if (!(await isFeatureEnabled("messaging"))) {
      return (
        <div className="mx-auto max-w-2xl">
          <div className="relative">
            <PageScene art="/brand/story-assistant.png" />
          <PageHeader title="Messages" subtitle="Chat with agents about their listings" />
          </div>
          <p className="nf-card p-6 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
            Messaging is paused for maintenance. Your conversations are safe and will be back
            shortly.
          </p>
        </div>
      );
    }

    const conversations = await loadConversationSummaries(session.supabase, session.user);
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Messages" subtitle="Chat with agents about their listings" />
        <LiveThreadList conversations={conversations} />
      </div>
    );
  }

  // ------------------------------------------------- seeded threads
  const conversations = await getMessageRepository().conversations();

  // Today's date in the same local `YYYY-MM-DD` shape the timestamps use, so
  // the list can show a time for today and a date for older conversations.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Messages" subtitle="Chat with agents about their listings" />
      <ConversationList conversations={conversations} today={today} />
    </div>
  );
}
