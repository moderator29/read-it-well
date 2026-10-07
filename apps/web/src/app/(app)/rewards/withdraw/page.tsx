import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { RewardsState } from "@/components/app/referral/RewardsState";
import { WithdrawFlow } from "@/components/app/referral/WithdrawFlow";
import { RewardsPauseNotice } from "@/components/app/referral/RewardsPauseNotice";
import { fill, REWARDS_PAUSED_EARNED_LINE } from "@/components/app/referral/money-words";
import { pausedProgramme, withdrawGate } from "@/lib/referral/rewards";
import { withdrawActions } from "@/lib/referral/rewards-read";
import { INVITE_HREF, REWARDS_HREFS, rewardsScreen, signInHref } from "../screen";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceRewards.withdraw.title, robots: { index: false, follow: false } };
}

/**
 * /rewards/withdraw: from the Rewards Balance to the member's bank (D51).
 *
 * The minimum and the way the fee is set are stated before anything is
 * prepared; the fee itself is the payout provider's, read back when the
 * withdrawal is prepared (`WithdrawFlow`). Four honest states before the flow:
 * the rewards read not live, withdrawals not open (no `WithdrawActions`,
 * R-C3-2), the available figure under the minimum, and no bank account.
 *
 * PAUSED (D64): withdrawing what is already earned carries on exactly as
 * before; the pause is said above it so nobody reads it as a freeze.
 */
export default async function RewardsWithdrawPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.experienceRewards;
  const w = copy.withdraw;
  const screen = await rewardsScreen();
  const header = <PageHeader title={w.title} subtitle={w.lede} fallback="/rewards" />;

  if (screen.kind === "state") {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <RewardsState read={screen.read} copy={copy.states} signInHref={signInHref("/rewards/withdraw")} inviteHref={INVITE_HREF} />
      </div>
    );
  }

  const { snapshot, words } = screen;
  const gate = withdrawGate(snapshot, withdrawActions !== null);
  const back = (
    <ButtonLink href="/rewards" variant="secondary" size="lg">
      {w.back}
    </ButtonLink>
  );

  const paused = pausedProgramme({ state: "ready", snapshot });

  return (
    <div className="mx-auto max-w-2xl space-y-block">
      {header}
      {paused ? <RewardsPauseNotice programme={paused} copy={copy.pause} earned={REWARDS_PAUSED_EARNED_LINE} locale={locale} /> : null}
      {gate === "open" && withdrawActions && snapshot.destination ? (
        <WithdrawFlow
          availableMinor={snapshot.balance.availableMinor}
          minimumMinor={snapshot.policy.withdrawMinimumMinor}
          destination={snapshot.destination}
          actions={withdrawActions}
          copy={w}
          money={words}
          locale={locale}
          historyHref={REWARDS_HREFS.history}
          backHref="/rewards"
        />
      ) : gate === "below-minimum" ? (
        <EmptyState
          icon="gift"
          art={false}
          title={w.belowMinimumTitle}
          body={fill(words.minimum, { minimum: formatMoney(snapshot.policy.withdrawMinimumMinor, locale) })}
          action={back}
          data-testid="rewards-withdraw-below-minimum"
        />
      ) : gate === "no-destination" ? (
        <EmptyState
          icon="gift"
          art={false}
          title={w.noDestinationTitle}
          body={w.errors.noDestination}
          action={
            <ButtonLink href="/settings/payments" variant="primary" size="lg">
              {w.addAccount}
            </ButtonLink>
          }
          data-testid="rewards-withdraw-no-destination"
        />
      ) : (
        <EmptyState
          icon="gift"
          art={false}
          title={w.notOpenTitle}
          body={w.notOpenBody}
          action={back}
          data-testid="rewards-withdraw-not-open"
        />
      )}
    </div>
  );
}
