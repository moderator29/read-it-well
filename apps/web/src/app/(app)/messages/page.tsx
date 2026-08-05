import type { Metadata } from "next";
import { resolveSession } from "@/lib/actions/session";
import { isFeatureEnabled } from "@/lib/flags";
import { loadConversationSummaries } from "@/lib/messages/live";
import { PageHeader } from "@/components/app/PageHeader";
import { PageScene } from "@/components/app/PageScene";
import { Inbox, InboxEmpty, type InboxRow } from "./Inbox";

export const metadata: Metadata = { title: "Inbox" };

/**
 * The Inbox: every conversation the reader is part of.
 *
 * It was called Messages, and it was a header with a flat list under it. The
 * word and the shape both changed: an inbox is a place you work through, so it
 * has a search field, a way to hold people you have never spoken to apart from
 * people you have, a compose button, and one act that clears the lot.
 *
 * Signed in on a configured platform the rows are real conversations under RLS
 * with real unread state. Signed out there is nothing, and this now says so.
 *
 * **It used to show a stranger somebody else's inbox.** Falling through to
 * `getMessageRepository()` served three invented conversations with named
 * agents about real listings, through this exact component, with no label
 * anywhere on the page. `lib/agent/repository.ts` had already decided the
 * principle when it deleted its own seeded agent: identity is the one thing a
 * "designed figures" label cannot rescue. So the fixture is deleted rather than
 * labelled, and what a signed-out reader gets is the truth plus the two ways
 * in.
 *
 * An empty inbox with a search field and two tabs would be a worse answer than
 * this panel. There is nothing to search and no request to sort, and offering
 * the controls of a thing somebody does not have is its own small lie.
 */

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

  // -------------------------------------------------------- nobody signed in
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative">
        <PageScene art="/brand/story-assistant.png" />
        <PageHeader title="Inbox" />
      </div>
      <InboxEmpty
        title="Sign in to see your messages"
        body="Conversations live with your account, so they follow you between devices and nobody else can read them. Message an agent from any listing to start one."
        action={{ href: "/sign-in", label: "Sign in" }}
        secondary={{ href: "/search", label: "Explore places" }}
      />
    </div>
  );
}
