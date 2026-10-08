import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FirstRunPanels } from "@/components/app/feature-onboarding/FirstRunPanels";
import { firstRunNext } from "@/components/app/feature-onboarding/first-run-device";
import {
  FIRST_RUN_HOME,
  canMount,
  firstRunContent,
  isMountedFirstRun,
} from "@/components/app/feature-onboarding/first-runs";
import { inviteRewards, type InviteRewards } from "@/lib/referral/rewards";
import { readMyRewards } from "@/lib/referral/rewards-read";
import { getAgentContext } from "@/lib/agent/listings-queries";
import type { ListingMeasurementRead } from "@/lib/promotion/measurement";
import { readListingMeasurement } from "@/lib/promotion/measurement-read";
import { promotionListingFrom } from "@/lib/promotion/listing-context";

export async function generateMetadata({ params }: { params: Promise<{ feature: string }> }): Promise<Metadata> {
  // The tab names the feature in the reader's language, as the region does.
  const { feature } = await params;
  const t = getDictionary(await getLocale());
  const robots = { index: false, follow: false };
  if (!isMountedFirstRun(feature)) return { robots };
  return { title: t.experienceFeatures.firstRun.region.replace("{feature}", firstRunContent(feature, t).name), robots };
}

/**
 * /first-run/[feature]: ONE FEATURE'S FIRST RUN, AS A PAGE (north star 14.1).
 *
 * A route and never a modal, so back behaves and a deep link (a notification,
 * a help article, "show me again") reaches it. Members only: `/first-run` is
 * not a public path, so the proxy sends a signed-out visitor to sign in first.
 *
 * Which features exist is `MOUNTED_FIRST_RUNS`; anything else, including the
 * waiting wallet, escrow and withdrawal runs whose screens do not exist yet,
 * is a 404 rather than a page that teaches a feature nobody can open.
 *
 * `?next=` is where the member was going, through the one return-path guard;
 * without it, or when it is not safe, both exits land on the feature's home.
 *
 * The invite's run reads the rewards read, the same gate as every rewards
 * surface (`inviteRewards`), and says what that state says: the link alone while
 * it is not live, the reward from the read's policy while it runs. While it
 * is paused there is no run at all (D64): the member is handed straight on
 * to where they were going, which says the pause and offers no invite.
 *
 * Its back destination is declared per feature in `lib/nav/route-parents.ts`
 * (the ten literal `/first-run/<key>` parents and the
 * `LITERAL_EXPANSIONS` entry), the feature's own parent, because the first
 * run stands in front of the feature rather than inside it.
 */
export default async function FirstRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ feature: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { feature } = await params;
  if (!isMountedFirstRun(feature)) notFound();

  const locale = await getLocale();
  const t = getDictionary(locale);
  const invite: InviteRewards | undefined = feature === "invite" ? inviteRewards(await readMyRewards()) : undefined;
  const raw = (await searchParams).next;
  const next = firstRunNext(Array.isArray(raw) ? raw[0] : raw, FIRST_RUN_HOME[feature]);
  if (invite?.state === "paused") redirect(next);

  const promotion = feature === "promotion" ? await readPromotionBaseline(next) : undefined;
  const content = firstRunContent(feature, t, locale, invite, promotion);
  if (!canMount(content)) notFound();

  const c = t.experienceFeatures.firstRun;

  return (
    <FirstRunPanels
      feature={feature}
      name={content.name}
      panels={content.panels}
      action={content.action}
      next={next}
      copy={{ skip: c.skip, next: c.next, page: c.page, pager: c.pager, region: c.region }}
    />
  );
}

/**
 * Promotion's third screen: the listing the run was opened from, its own
 * last thirty days, read through the lister's own client
 * (`readListingMeasurement` checks the listing is theirs). No listing in
 * `next`: the screen says what it would show.
 */
async function readPromotionBaseline(next: string): Promise<ListingMeasurementRead> {
  const listingId = promotionListingFrom(next);
  if (!listingId) return { state: "no-listing" };
  const context = await getAgentContext();
  if (context.state !== "agent") return { state: "missing" };
  return readListingMeasurement(context.supabase, context.agent.id, listingId);
}
