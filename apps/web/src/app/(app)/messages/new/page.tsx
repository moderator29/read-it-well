import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { resolveSession } from "@/lib/actions/session";
import { startConversation } from "@/lib/messages/actions";
import { getMessageRepository } from "@/lib/messages/repository";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyState } from "@/components/app/Screen";

export const metadata: Metadata = { title: "New message" };

/**
 * /messages/new?listing=<id>: the bridge from a property to its conversation.
 *
 * A tiny server component, and the single most important hop in the messaging
 * journey. Signed in, it finds or creates the thread with the listing's agent
 * and lands straight in it, so the property context is carried into the
 * conversation and nobody ever has to open with "which property". When it
 * cannot, the screen says exactly why and offers the way forward.
 *
 * EVERY "MESSAGE AGENT" CONTROL ON THE PLATFORM NOW ARRIVES HERE. The listing
 * detail page previously sent four of its five message controls to `/messages`,
 * the inbox, because it looked up an existing conversation and fell back to the
 * list when there was none - which, since `conversationIdForListing` returns
 * null unless a thread already exists, was every first contact with every
 * agent. A person who tapped Message agent on a property landed on an empty
 * inbox with no way back to what they were doing. This route was already
 * correct and already used by the rental branch; it is now used by all of them.
 *
 * THE SIGNED-OUT BRANCH CARRIES THE INTENT HOME. It used to link to a bare
 * `/sign-in`, which dropped the person on the far side of authentication with
 * no memory of the property they were trying to message about: they had to find
 * it again from scratch. It now goes through `authHref`/`returnHref`, the same
 * mechanism every other gated control on the platform uses, so signing in
 * returns them to THIS route with THIS listing and the thread opens.
 */

/** One shape for all three refusals, so the bridge never looks like three screens. */
function Bridge({
  title,
  message,
  listingId,
  primary,
}: {
  title: string;
  message: string;
  listingId: string;
  primary: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Inbox" fallback={`/listing/${listingId}`} />
      <EmptyState
        icon="chat-duo"
        title={title}
        body={message}
        action={primary}
        secondary={
          /* Never a dead end, and never a lap of the same screen: the quiet
             half goes back to the property they came from, which is the one
             place we know they wanted to be. */
          <ButtonLink href={`/listing/${listingId}`} variant="ghost">
            Back to the property
          </ButtonLink>
        }
      />
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
    return (
      <Bridge
        title="This chat cannot open yet"
        message={result.error}
        listingId={listing}
        primary={
          <ButtonLink href="/messages" variant="primary">
            Go to your Inbox
          </ButtonLink>
        }
      />
    );
  }

  // Signed out or unconfigured: a seeded thread for this listing still
  // deep-links, so the surface never dead-ends.
  const seedThreadId = await getMessageRepository().conversationIdForListing(listing);
  if (seedThreadId) redirect(`/messages/${seedThreadId}`);

  if (session.state === "signed-out") {
    /*
     * Come back HERE, with this listing, ready to finish the job. `returnHref`
     * stamps the verb on so the far side knows what was interrupted, and the
     * auth routes validate the path again server side because `next` is the
     * classic open redirect.
     */
    const next = returnHref("/messages/new", `?listing=${listing}`, "message");
    return (
      <Bridge
        title="Sign in to message the agent"
        message="Chat with the agent, arrange an inspection and keep every step of the deal in one protected place. You will come straight back to this conversation."
        listingId={listing}
        primary={
          <ButtonLink href={authHref(next, "sign-in")} variant="primary">
            Sign in
          </ButtonLink>
        }
      />
    );
  }

  return (
    <Bridge
      title="Messaging is nearly here"
      message="Messaging for this listing switches on the moment the platform keys land. Nothing is lost; come back soon."
      listingId={listing}
      primary={
        <ButtonLink href="/messages" variant="primary">
          Go to your Inbox
        </ButtonLink>
      }
    />
  );
}
