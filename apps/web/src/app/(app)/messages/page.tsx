import type { Metadata } from "next";
import { resolveSession } from "@/lib/actions/session";
import { isFeatureEnabled } from "@/lib/flags";
import { loadConversationSummaries } from "@/lib/messages/live";
import { getMessageRepository } from "@/lib/messages/repository";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { Inbox, type InboxRow } from "./Inbox";

export const metadata: Metadata = { title: "Inbox" };

/**
 * The Inbox: every conversation the reader is part of.
 *
 * It was called Messages, and it was a header with a flat list under it. The
 * word and the shape both changed: an inbox is a place you work through, so it
 * has a search field, a way to hold people you have never spoken to apart from
 * people you have, a compose button, and one act that clears the lot.
 *
 * One rendering component for both worlds. Signed in on a configured platform
 * the rows are real conversations under RLS with real unread state; otherwise
 * the seed threads carry the same surface with the same states, so nobody sees
 * two different products depending on who is holding the phone.
 *
 * Seed rows are never requests. A request is a claim about a relationship, and
 * the seed catalogue has no relationships to make claims about.
 */

/** "2026-07-28T09:14" renders as "09:14" today and "26 Jul" otherwise. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function seedWhenLabel(sentAt: string, today: string): string {
  if (sentAt.startsWith(today)) return sentAt.slice(11, 16);
  const month = MONTHS[Number(sentAt.slice(5, 7)) - 1] ?? "";
  return `${Number(sentAt.slice(8, 10))} ${month}`;
}

export default async function InboxPage() {
  const session = await resolveSession();

  if (session.state === "signed-in") {
    if (!(await isFeatureEnabled("messaging"))) {
      return (
        <div className="mx-auto max-w-2xl">
          <div className="relative">
            <PageScene art="/brand/story-assistant.png" />
            <PageHeader title="Inbox" />
          </div>
          <p className="nf-card p-6 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
            Messaging is paused for maintenance. Your conversations are safe and will be
            back shortly.
          </p>
        </div>
      );
    }

    const conversations = await loadConversationSummaries(session.supabase, session.user);
    const rows: InboxRow[] = conversations.map((c) => ({
      id: c.id,
      counterpartName: c.counterpartName,
      listingTitle: c.listingTitle,
      lastMessage: c.lastMessage,
      whenLabel: c.whenLabel,
      unread: c.unread,
      isRequest: c.isRequest,
      counterpartKind: c.counterpartKind,
      counterpartVerified: c.counterpartVerified,
    }));

    return (
      <div className="mx-auto max-w-2xl">
        <Inbox rows={rows} meId={session.user.id} canMarkRead />
      </div>
    );
  }

  // ------------------------------------------------------- seeded threads
  const conversations = await getMessageRepository().conversations();

  // Today's date in the same local `YYYY-MM-DD` shape the timestamps use, so
  // a row can show a time for today and a date for anything older.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const rows: InboxRow[] = conversations.map((c) => ({
    id: c.id,
    counterpartName: c.agentName,
    listingTitle: c.listingTitle,
    lastMessage: c.lastMessage,
    whenLabel: seedWhenLabel(c.lastMessageAt, today),
    unread: c.unread ? 1 : 0,
    isRequest: false,
    counterpartKind: "agent",
    counterpartVerified: false,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Inbox rows={rows} />
    </div>
  );
}
