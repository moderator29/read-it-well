import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { isFeatureEnabled } from "@/lib/flags";
import { loadThread } from "@/lib/messages/live";
import { getMessageRepository } from "@/lib/messages/repository";
import { ThreadView, type ThreadBubble } from "./ThreadView";

/**
 * A single conversation thread.
 *
 * Thin server shell with two sources of truth. Signed in on a configured
 * platform, the thread loads from the database under the caller's own RLS
 * (membership included) and renders live. Otherwise the seeded threads carry
 * the surface, exactly as before. Unknown ids fall through to not-found
 * rather than rendering an empty shell.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (UUID_RE.test(id)) return { title: "Conversation" };
  const thread = await getMessageRepository().conversation(id);
  return { title: thread?.agentName ?? "Conversation" };
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
          <PageHeader title="Messages" fallback="/messages" />
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

  // ------------------------------------------------- seeded threads
  const seed = await getMessageRepository().conversation(id);
  if (!seed) notFound();

  return (
    <ThreadView
      live={false}
      conversationId={seed.id}
      meId={null}
      counterpartName={seed.agentName}
      listing={{
        id: seed.listing.id,
        title: seed.listing.title,
        area: seed.listing.area,
        city: seed.listing.city,
        verified: seed.listing.verified,
        approved: seed.listing.approved,
        hue: seed.listing.hue,
      }}
      inspected={false}
      messages={seed.messages.map(
        (m): ThreadBubble => ({
          id: m.id,
          mine: m.author === "guest",
          body: m.body,
          timeLabel: m.sentAt.slice(11, 16),
          imageUrl: m.image?.src ?? null,
        }),
      )}
    />
  );
}
