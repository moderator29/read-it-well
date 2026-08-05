import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { isFeatureEnabled } from "@/lib/flags";
import { loadThread } from "@/lib/messages/live";
import { ThreadView, type ThreadBubble } from "./ThreadView";
import { InboxEmpty } from "../Inbox";

/**
 * A single conversation thread.
 *
 * Thin server shell. Signed in on a configured platform, the thread loads from
 * the database under the caller's own RLS (membership included) and renders
 * live. Signed out there is no thread to render, and this asks the reader to
 * sign in rather than inventing one.
 *
 * **It used to invent one, and this was the worse of the two routes that did.**
 * A signed-out visitor fell through to a seeded thread and got the whole
 * conversation: a named agent who does not exist, and `mine: m.author ===
 * "guest"` mapping half the bubbles to the visitor, so they were shown words
 * they had never written, attributed to them. `lib/messages/repository.ts`
 * carries the reasoning and no longer carries the fixture.
 *
 * Not-found is deliberately not the answer here. The conversation the link
 * points at may well exist and simply not be readable without a session, and
 * telling somebody a real thing does not exist is the same class of lie in the
 * other direction.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  /* Every conversation is somebody's, so the title never names a counterpart:
     a tab title is the one piece of a private page that gets screenshotted,
     read over a shoulder and restored by the browser months later. */
  await params;
  return { title: "Conversation" };
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await resolveSession();

  if (session.state === "signed-in") {
    if (!(await isFeatureEnabled("messaging"))) {
      return (
        <div className="mx-auto max-w-2xl">
          <PageHeader title="Inbox" fallback="/messages" />
          <p className="nf-card p-6 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
            Messaging is paused for maintenance. Your conversations are safe and will be back
            shortly.
          </p>
        </div>
      );
    }

    if (!UUID_RE.test(id)) notFound();
    const thread = await loadThread(session.supabase, session.user, id);
    if (!thread) notFound();

    return (
      <ThreadView
        live
        conversationId={thread.conversationId}
        meId={thread.meId}
        counterpartName={thread.counterpartName}
        listing={
          thread.listing
            ? {
                id: thread.listing.id,
                title: thread.listing.title,
                area: thread.listing.area,
                city: thread.listing.city,
                verified: thread.listing.verified,
                approved: true,
                hue: thread.listing.hue,
              }
            : null
        }
        inspected={thread.inspected}
        messages={thread.messages.map(
          (m): ThreadBubble => ({
            id: m.id,
            mine: m.mine,
            body: m.body,
            timeLabel: m.timeLabel,
            imageUrl: m.imageUrl,
          }),
        )}
      />
    );
  }

  // -------------------------------------------------------- nobody signed in
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Conversation" fallback="/messages" />
      <InboxEmpty
        title="Sign in to read this conversation"
        body="A conversation is only ever readable by the two people in it, so this one needs your account. Sign in and it opens where you left it."
        action={{ href: "/sign-in", label: "Sign in" }}
        secondary={{ href: "/search", label: "Explore places" }}
      />
    </div>
  );
}
