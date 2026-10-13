import "server-only";
import type { AgentContext } from "@/lib/agent/listings-queries";
import type { FreshnessRow } from "@/lib/agent/freshness";
import { getAgentInbox } from "@/lib/agent/messages-queries";
import { readDeskStages } from "@/lib/enquiry/queries";
import { readFollowups } from "@/lib/enquiry/followup-queries";
import { groupFollowups } from "@/lib/enquiry/followup";
import { callableNumbersFor } from "@/lib/security/counterpart-contact";
import { readAgentInputs, readFeatured } from "@/lib/workspace/dashboard-agent";
import { readOwnerInputs } from "@/lib/workspace/dashboard-owner";
import {
  ownerView,
  pickFeatured,
  recentContacts,
  reminders,
  visitsToday,
  type ContactThread,
  type OwnerView,
} from "@/lib/workspace/dashboard-model";
import type { AgentDash } from "@/components/workspace/dashboard/Sections";

type AgentCtx = Extract<AgentContext, { state: "agent" }>;

/** The owner dashboard's reads and view model, plus the places the agreements card names. */
export async function loadOwnerDash(
  context: AgentCtx,
  now: Date,
): Promise<{ view: OwnerView; places: ReadonlyMap<string, string> }> {
  const inputs = await readOwnerInputs(context.supabase, context.user.id, now);
  const places = new Map((inputs.buildings ?? []).flatMap((b) => (b.place ? [[b.listingId, b.place] as const] : [])));
  return { view: ownerView(inputs, now), places };
}

/**
 * The agent dashboard's reads, joined into the one object the cards draw.
 *
 * `freshness` is the page's own read of the live listings and when each was
 * last said to be available (null when it could not be read); `dueCount` is
 * how many of them are due for a "still available?" answer.
 */
export async function loadAgentDash(
  context: AgentCtx,
  ctx: { now: Date; liveListings: number; freshness: readonly FreshnessRow[] | null; dueCount: number | null },
): Promise<AgentDash> {
  const { now } = ctx;
  const [inputs, followups, stages, inbox] = await Promise.all([
    readAgentInputs(context.supabase, { userId: context.user.id, agentId: context.agent.id }, now),
    readFollowups(context.supabase),
    readDeskStages(),
    getAgentInbox(),
  ]);

  const groups = followups ? groupFollowups(followups, stages, now) : null;
  const due = groups ? groups.overdue.length + groups.today.length : null;

  const pick = ctx.freshness
    ? pickFeatured(
        ctx.freshness.map((row) => row.id),
        inputs.enquiries ?? [],
        now,
      )
    : null;
  const featured = await readFeatured(context.supabase, pick, inputs.enquiries !== null);

  const threads: ContactThread[] | null =
    inbox.state === "ready"
      ? inbox.inbox.threads.map((th) => ({
          id: th.id,
          counterpartName: th.counterpartName,
          counterpartId: th.counterpartId,
          counterpartAvatarUrl: th.counterpartAvatarUrl,
          listingTitle: th.listingTitle,
          lastAt: th.lastAt,
          contextKind: th.contextKind,
        }))
      : null;
  /* A number is handed out only for the few people on the list, and only
     where the thread's rules allow it (no block, a number on file). */
  const shown = threads ? recentContacts(threads, 5) : [];
  const callNumbers = await callableNumbersFor(
    context.user.id,
    shown.flatMap((c) => (c.counterpartId ? [c.counterpartId] : [])),
  );

  return {
    enquiries: inputs.enquiries,
    visits: inputs.visits,
    closedDeals: inputs.closedDeals,
    liveListings: ctx.liveListings,
    featured,
    reminders: reminders({
      followupsDue: due,
      ...(groups ? { followupsOverdue: groups.overdue.length } : {}),
      visitsToday: inputs.visits ? visitsToday(inputs.visits, now).length : null,
      expiring: ctx.dueCount,
    }),
    threads,
    callNumbers,
  };
}
