import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { resolveSession } from "@/lib/actions/session";
import { isFeatureEnabled } from "@/lib/flags";
import { getThreadContext, loadThread, type ThreadContext } from "@/lib/messages/live";
import { readOpenInspectionForConversation } from "@/lib/inspections/queries";
import { heldPaymentsAreOpen } from "@/lib/escrow/flag";
import { readHeldPaymentForConversation } from "@/lib/escrow/queries";
import { ThreadView, type ThreadBubble } from "./ThreadView";
import { resolveCards } from "./cards";
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

/**
 * Which end of the conversation the viewer is.
 *
 * `agent_id` is the lister on a listing thread, the restaurant on a
 * reservation thread and the property on a booking thread; `guest_id` is the
 * other side. Neither `loadThread` nor `getThreadContext` says which one the
 * caller is, so this asks the row directly under the caller's own RLS. Both
 * of those readers already select the two columns, so either could return
 * `viewerRole` and this read would go away.
 */
async function viewerRole(
  supabase: Parameters<typeof loadThread>[0],
  me: string,
  conversationId: string,
): Promise<"host" | "guest"> {
  const { data } = await supabase
    .from("conversations")
    .select("agent_id")
    .eq("id", conversationId)
    .maybeSingle();
  return data?.agent_id === me ? "host" : "guest";
}

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

/**
 * Which of my messages the other side has opened.
 *
 * `loadThread` does not carry `read_at` (its file is the messaging worker's),
 * so the ticks read it here: one bounded select under the caller's own RLS,
 * ids only. The line for that worker is that `LiveThreadMessage` should
 * carry `readAt` and this read goes away.
 */
async function readIds(
  supabase: Parameters<typeof loadThread>[0],
  conversationId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .not("read_at", "is", null)
    .limit(200);
  return new Set((data ?? []).map((row) => row.id));
}

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attach?: string | string[] }>;
}) {
  const { id } = await params;
  const { attach } = await searchParams;
  const session = await resolveSession();

  if (session.state === "signed-in") {
    if (!(await isFeatureEnabled("messaging"))) {
      return (
        <div className="mx-auto max-w-2xl">
          <PageHeader title="Inbox" fallback="/messages" />
          <p className="nf-panel nf-panel--card p-lg text-center text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-muted)]">
            Messaging is paused for maintenance. Your conversations are safe and nothing has
            been lost. Try again in a few minutes.
          </p>
        </div>
      );
    }

    if (!UUID_RE.test(id)) notFound();
    const locale = await getLocale();
    const t = getDictionary(locale);
    const [thread, contextRead, role, read, heldPaymentsOpen, heldPayment] = await Promise.all([
      loadThread(session.supabase, session.user, id),
      getThreadContext(id),
      viewerRole(session.supabase, session.user.id, id),
      readIds(session.supabase, id),
      /*
       * THE KILL SWITCH, READ PER REQUEST AND FAILING CLOSED. It is not
       * cached and it is not `lib/flags.ts`, which is fail-open by design: a
       * proposal surface that appears because the flags table blinked is a
       * promise nobody chose to make. No row means closed, which is what the
       * database says today.
       */
      heldPaymentsAreOpen(),
      /*
       * The open agreement this thread carries, under the caller's own RLS. A
       * failed read is treated exactly as none: the thread shows the opener
       * rather than claiming there is nothing, and `/escrow` is where the
       * authoritative list lives. This is the one place that difference does
       * not matter, because the composer's refusal on a second agreement is
       * the database's, not the screen's.
       */
      readHeldPaymentForConversation(id),
    ]);
    if (!thread) notFound();
    /* The shared listings and bookings, expanded into cards for this reader. */
    const cards = await resolveCards(session.supabase, thread.messages, locale);
    /*
     * The context decides the banner. A read that came back null (a race with
     * the thread being removed, or a kind the query could not resolve) is a
     * plain listing thread with no banner rather than a broken one.
     */
    const context: ThreadContext = contextRead ?? { kind: "listing" };
    /* Only a listing thread can carry a live inspection; the other faces never
       ask, structurally. */
    const inspection =
      context.kind === "listing" ? await readOpenInspectionForConversation(id) : null;

    return (
      <ThreadView
        live
        conversationId={thread.conversationId}
        meId={thread.meId}
        context={context}
        inspection={inspection}
        role={role}
        threadCopy={t.threads}
        locale={locale}
        /*
          THE COUNTERPART'S BADGE, AND THE DEFECT THAT USED TO BE ON THIS LINE.

          This read `thread.listing?.verified`. That key sits on the LISTING
          object and is a fact about a PROPERTY, and it was being handed to the
          component that draws the mark beside a PERSON'S name, on the screen
          where somebody decides whether to send a stranger a deposit. The note
          that stood here argued it was "the same value" because `loadThread`
          happened to file the person's badge under that key, and it named the
          cost it could see: a direct message with no listing attached carried
          nothing, so a checked agent messaging outside a listing showed no
          mark at all. It needed a top-level field.

          That field now exists. `loadThread` returns `counterpartTier`, the
          published `public.person_badge.tier`, beside `counterpartName`, and
          this line is it. A thread with no listing draws the right mark, and
          the property's own badge can never again stand in for a human check.
          `VerifiedAvatar`'s own docstring had been warning against exactly this
          substitution while this call site was performing it.
        */
        counterpartTier={thread.counterpartTier}
        counterpartName={thread.counterpartName}
        /* Null unless `lib/security/counterpart-contact.ts` allowed it: RLS
           membership first, a block in either direction withholds it, every
           failure withholds. The header draws no call control on null. */
        counterpartPhone={thread.counterpartPhone}
        /* The other party's id, resolved under the same RLS membership check
           that made this reader a party at all. It exists so the options
           sheet can offer Block, which before this had no id to act on. */
        counterpartId={thread.counterpartId}
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
        openAttach={(Array.isArray(attach) ? attach[0] : attach) === "1"}
        heldPaymentsOpen={heldPaymentsOpen}
        agreement={
          heldPayment.payment
            ? {
                id: heldPayment.payment.id,
                state: heldPayment.payment.state,
                amountMinor: heldPayment.payment.amountMinor,
                purpose: heldPayment.payment.purpose,
                viewer: heldPayment.payment.viewer,
              }
            : null
        }
        messages={thread.messages.map((m): ThreadBubble => {
          const card = cards.get(m.id);
          return {
            id: m.id,
            mine: m.mine,
            body: m.body,
            timeLabel: m.timeLabel,
            imageUrl: m.imageUrl,
            read: read.has(m.id),
            ...(card ? { card } : {}),
          };
        })}
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
