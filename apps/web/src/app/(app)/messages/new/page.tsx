import type { Metadata } from "next";
import { attributeConversation } from "@/lib/share/attribution";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { findConversationForListing } from "@/lib/messages/actions";
import { getListingRepository } from "@/lib/listings/repository";
import { FirstMessage } from "./FirstMessage";
import { getMessageRepository } from "@/lib/messages/repository";
import { authHref, returnHref } from "@/components/auth/auth-intent";
import { EmptyActions } from "@/components/app/EmptyActions";
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
  primary: { label: string; href: string };
}) {
  return (
    /*
      THE GUTTER AND THE TITLE, BOTH WRONG ON THE SAME SCREEN, AND THE GUTTER IS
      FIXED AT THE ROOT NOW.

      `AppShell` treated `/messages/[^/]+` as immersive, which `/messages/new`
      matched, and immersive drops the page gutter and the top inset. This
      Bridge had none of its own, so the back button sat at exactly x=0, y=0
      with its tap target clipped by the screen edge, and on a notched phone it
      was under the status bar.

      The first fix was for this screen to carry its own `px-gutter pt-block`,
      because the regex was thought to belong to another owner. It does not:
      `isImmersiveRoute` now lives beside `TAB_BAR_ROUTES`, excludes this route
      by name, and the shell gives this page the ordinary wrapper. So the local
      compensation is GONE rather than left in - two gutters is the same bug
      pointed the other way, and a padding that exists to cancel a condition
      that no longer holds is the next person's puzzle.

      The title stays fixed. It said "Inbox" on a screen that is not the inbox:
      it is the first contact with an agent about one property, which its own
      docstring calls the single most important hop in the messaging journey.
    */
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Message the agent" fallback={`/listing/${listingId}`} />
      <EmptyState
        icon="chat-duo"
        title={title}
        body={message}
        action={
          /* Never a dead end, and never a lap of the same screen: the quiet
             half goes back to the property they came from, which is the one
             place we know they wanted to be. Both halves through
             `EmptyActions`, so this refusal has the same shape as every other
             empty state in the product. */
          <EmptyActions
            primary={primary}
            secondary={{ label: "Back to the property", href: `/listing/${listingId}` }}
          />
        }
      />
    </div>
  );
}

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string; then?: string }>;
}) {
  const { listing, then } = await searchParams;
  /* V-69: "Show me..." on a listing opens the thread with the ask ready. */
  const suffix = then === "showme" ? "?showme=1" : "";
  if (!listing) redirect("/messages");

  const session = await resolveSession();

  if (session.state === "signed-in") {
    /* UX-P2-03: look, do not write. An existing thread opens; otherwise the
       first message makes the thread, so an abandoned tap leaves nothing. */
    const result = await findConversationForListing({ listingId: listing });
    if (result.ok && result.data.conversationId) {
      /* V-71: credit the lister whose link this device first came through.
         A thread made by the first message is credited in its action. */
      await attributeConversation(session.supabase, result.data.conversationId);
      redirect(`/messages/${result.data.conversationId}${suffix}`);
    }
    if (result.ok) {
      const found = await getListingRepository().byId(listing);
      return (
        <div className="mx-auto max-w-2xl">
          <PageHeader title="Message the agent" fallback={`/listing/${listing}`} />
          <FirstMessage listingId={listing} listingTitle={found?.title ?? null} suffix={suffix} />
        </div>
      );
    }
    return (
      <Bridge
        title="This chat cannot open yet"
        message={result.error}
        listingId={listing}
        primary={{ label: "Go to your Inbox", href: "/messages" }}
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
    const next = returnHref("/messages/new", `?listing=${listing}${then === "showme" ? "&then=showme" : ""}`, "message");
    return (
      <Bridge
        title="Sign in to message the agent"
        message="Chat with the agent, arrange an inspection and keep every step of the deal in one place, on the record. You will come straight back to this conversation."
        listingId={listing}
        primary={{ label: "Sign in", href: authHref(next, "sign-in") }}
      />
    );
  }

  return (
    <Bridge
      title="We cannot reach messaging right now"
      message="This is on our side, not yours. Nothing has been lost and nothing has been sent. Try again in a few minutes."
      listingId={listing}
      primary={{ label: "Go to your Inbox", href: "/messages" }}
    />
  );
}
