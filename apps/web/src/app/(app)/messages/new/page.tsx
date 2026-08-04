import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { resolveSession } from "@/lib/actions/session";
import { startConversation } from "@/lib/messages/actions";
import { getMessageRepository } from "@/lib/messages/repository";

export const metadata: Metadata = { title: "New message" };

/**
 * /messages/new?listing=<id>: the bridge from a listing to its conversation.
 *
 * A tiny server component. Signed in, it finds or creates the thread with the
 * listing's agent and lands straight in it. When it cannot, the screen says
 * exactly why: sign in first, or the listing is not live on the platform yet.
 * The seeded threads still deep-link for signed-out visitors, so the flow
 * stays walkable end to end before the keys land.
 */

function Fallback({
  title,
  message,
  listingId,
}: {
  title: string;
  message: string;
  listingId: string;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Inbox" fallback="/messages" />
      <div className="nf-card nf-rise p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[var(--nf-electric-300)]">
          <UiIcon name="chat-bubble" size={24} />
        </span>
        <h2 className="nf-h3 mt-4">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
          {message}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
          <Link href={`/listing/${listingId}`} className="nf-btn nf-btn--glass">
            Back to the listing
          </Link>
          <Link href="/messages" className="nf-btn nf-btn--primary">
            Go to your Inbox
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string }>;
}) {
  const { listing } = await searchParams;
  if (!listing) redirect("/messages");

  const session = await resolveSession();

  if (session.state === "signed-in") {
    const result = await startConversation({ listingId: listing });
    if (result.ok) redirect(`/messages/${result.data.conversationId}`);
    return <Fallback title="This chat cannot open yet" message={result.error} listingId={listing} />;
  }

  // Signed out or unconfigured: the seeded thread for this listing still
  // deep-links, so the surface never dead-ends.
  const seedThreadId = await getMessageRepository().conversationIdForListing(listing);
  if (seedThreadId) redirect(`/messages/${seedThreadId}`);

  if (session.state === "signed-out") {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Inbox" fallback="/messages" />
        <div className="nf-card nf-rise p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--nf-brand-primary)_22%,transparent)] text-[var(--nf-electric-300)]">
            <UiIcon name="chat-bubble" size={24} />
          </span>
          <h2 className="nf-h3 mt-4">Sign in to message the agent</h2>
          <p className="mx-auto mt-2 max-w-md text-[0.875rem] leading-relaxed text-[var(--nf-content-muted)]">
            Chat with the agent, arrange an inspection and keep every step of the deal in one
            protected place.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <Link href={`/listing/${listing}`} className="nf-btn nf-btn--glass">
              Back to the listing
            </Link>
            <Link href="/sign-in" className="nf-btn nf-btn--primary">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Fallback
      title="Messaging is nearly here"
      message="Messaging for this listing switches on the moment the platform keys land. Nothing is lost; come back soon."
      listingId={listing}
    />
  );
}
