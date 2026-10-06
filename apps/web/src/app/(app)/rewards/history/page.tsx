import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { RewardsHistory } from "@/components/app/referral/RewardsHistory";
import { RewardsState } from "@/components/app/referral/RewardsState";
import { RewardsPauseNotice } from "@/components/app/referral/RewardsPauseNotice";
import { REWARDS_PAUSED_EARNED_LINE } from "@/components/app/referral/money-words";
import { pausedProgramme } from "@/lib/referral/rewards";
import { INVITE_HREF, rewardsScreen, signInHref } from "../screen";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceRewards.history.title, robots: { index: false, follow: false } };
}

/**
 * /rewards/history: every amount added to the Rewards Balance or taken from
 * it, newest first, read like a statement. Draws the not-live state until
 * R-C3-1 exists. Paused (D64), the pause is said above a history that is
 * otherwise exactly as it was: a pause never reaches backwards.
 */
export default async function RewardsHistoryPage() {
  const locale = await getLocale();
  const copy = getDictionary(locale).experienceRewards;
  const screen = await rewardsScreen();
  const header = <PageHeader title={copy.history.title} subtitle={copy.history.lede} fallback="/rewards" />;

  if (screen.kind === "state") {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <RewardsState read={screen.read} copy={copy.states} signInHref={signInHref("/rewards/history")} inviteHref={INVITE_HREF} />
      </div>
    );
  }

  const paused = pausedProgramme({ state: "ready", snapshot: screen.snapshot });

  return (
    <div className="mx-auto max-w-2xl space-y-block">
      {header}
      {paused ? <RewardsPauseNotice programme={paused} copy={copy.pause} earned={REWARDS_PAUSED_EARNED_LINE} locale={locale} /> : null}
      {screen.snapshot.history.length === 0 ? (
        <EmptyState
          icon="gift"
          art={false}
          title={copy.history.emptyTitle}
          body={copy.history.emptyBody}
          data-testid="rewards-history-empty"
        />
      ) : (
        <RewardsHistory entries={screen.snapshot.history} copy={copy.history} locale={locale} />
      )}
    </div>
  );
}
