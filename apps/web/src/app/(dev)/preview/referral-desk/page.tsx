import "@/app/css/admin.css";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ReferralDesk, type ReferralTabData } from "@/app/admin/referrals/ReferralDesk";
import { readReferralQuery } from "@/lib/admin/reads/referrals-model";
import { ConsoleFrame } from "../bd/ConsoleFrame";
import { DESK, EDGES, GRAPH, GROUPS, ID, NOW, PAYOUTS_IN_FLIGHT, PAYOUTS_WAITING, REVIEW_ITEMS } from "./fixtures";

/**
 * The referral desk on the console frame, from fixtures on the pinned Tuesday
 * 13 October 2026. The desk is `ReferralDesk` itself, fed what the reads in
 * `lib/admin/reads/referrals.ts` would return. The query string drives it as
 * on the real desk (`?tab=fraud`, `?tab=payouts`, `?member=<id>`), and
 * `?state=` picks a condition:
 *
 *   empty     nothing waiting anywhere, no live campaign, no budget row
 *   down      every read unavailable
 *   paused    the budget is used up and the programme is paused
 *   loop      a long chain, to show the graph's cap and its loop line
 *
 * Never the proof of a write: the controls open their sheets, but the actions
 * need a signed-in admin.
 */
export const dynamic = "force-dynamic";

export default async function PreviewReferralDesk({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const state = typeof params.state === "string" ? params.state : "";
  const locale = await getLocale();
  const t = getDictionary(locale);
  const query = readReferralQuery(params);

  const empty = state === "empty";
  const down = state === "down";
  const paused = state === "paused";

  const desk = down
    ? ({ state: "unavailable" } as const)
    : ({
        state: "ok",
        data: empty
          ? {
              ...DESK,
              live: null,
              budgets: [],
              programme: { open: false, reason: "no_campaign" },
              counts: Object.fromEntries(Object.keys(DESK.counts).map((k) => [k, 0])) as typeof DESK.counts,
              liability: {
                ...DESK.liability,
                owedMinor: 0,
                pendingMinor: 0,
                paidMinor: 0,
                reversedAfterPaidMinor: 0,
                budgetCapMinor: null,
                budgetCommittedMinor: null,
                blockedOn: {},
                referralsUnderReview: 0,
                payoutsUnderReview: 0,
              },
            }
          : paused
            ? {
                ...DESK,
                programme: { open: false, reason: "budget_reached" },
                liability: { ...DESK.liability, budgetCommittedMinor: 70_000_000 },
              }
            : DESK,
      } as const);

  const member = query.member ?? ID(1);
  const longEdges =
    state === "loop"
      ? Array.from({ length: 95 }, (_, i) => ({
          referrerId: ID(1000 + i),
          referredId: ID(1001 + i),
          status: "available",
          riskScore: i % 9 === 0 ? 45 : 0,
          riskReasons: [] as string[],
          depth: 1 + (i % 4),
        }))
      : null;

  const tab: ReferralTabData =
    query.tab === "review"
      ? { review: down ? { state: "unavailable" } : { state: "ok", data: { items: empty ? [] : REVIEW_ITEMS, total: empty ? 0 : REVIEW_ITEMS.length } } }
      : query.tab === "payouts"
        ? {
            payouts: down
              ? { state: "unavailable" }
              : { state: "ok", data: { waiting: empty ? [] : PAYOUTS_WAITING, inFlight: empty ? [] : PAYOUTS_IN_FLIGHT } },
          }
        : {
            fraud: down ? { state: "unavailable" } : { state: "ok", data: { groups: empty ? [] : GROUPS } },
            graph: {
              member: empty && !query.member ? null : member,
              usingDefault: !query.member,
              read: down
                ? { state: "unavailable" }
                : { state: "ok", data: longEdges ? { edges: longEdges, names: GRAPH.names } : { edges: EDGES, names: GRAPH.names } },
            },
          };

  return (
    <ConsoleFrame t={t}>
      <ReferralDesk query={query} locale={locale} copy={t.referralDesk} desk={desk} tab={tab} now={NOW} />
    </ConsoleFrame>
  );
}
