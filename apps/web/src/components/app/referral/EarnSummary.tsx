import "./rewards.css";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { MoneyFigure } from "@/components/money/kit";
import type { RewardsSnapshot } from "@/lib/referral/rewards";
import { pendingSentence, qualifySentence } from "./invite-rewards";
import { money } from "./format";
import { fill } from "./money-words";

type Copy = Dictionary["experienceRewards"];

/**
 * HOW A MEMBER EARNS, SAID BEFORE THEY INVITE ANYBODY (D85, the founder,
 * 8 October 2026: "Earn {amount} for each friend who signs up fully").
 *
 * The headline's amount, the monthly count, the steps that make a sign-up
 * "full" and the review window are the live campaign's, from the read; the
 * sentences are `lib/money/copy.ts`'s. Drawn only while the programme runs
 * (the caller decides): a paused month never invites under a reward. Server-safe.
 */
export function EarnCard({ snapshot, copy, locale }: { snapshot: RewardsSnapshot; copy: Copy; locale: Locale }) {
  const { policy } = snapshot;
  return (
    <Panel variant="card" className="nf-rewards-earn" data-testid="rewards-earn">
      <p className="nf-rewards-figures__label">{copy.earn.label}</p>
      <h2 className="nf-rewards-earn__headline" data-testid="rewards-earn-headline">
        {fill(copy.earn.headline, { amount: money(policy.rewardPerReferralMinor, locale) })}
      </h2>
      <p className="nf-rewards-earn__body">{qualifySentence(policy, locale)}</p>
      <p className="nf-rewards-earn__body">{pendingSentence(policy, locale)}</p>
    </Panel>
  );
}

/**
 * THE INVITE HUB'S EARNINGS (D85): the reward per friend, the four figures
 * at a glance (Available, Pending, Paid out, Earned in total, every one from
 * the read), and the door to the full earnings dashboard at `/rewards`.
 * Server-safe.
 */
export function InviteEarnings({
  snapshot,
  copy,
  locale,
  href,
}: {
  snapshot: RewardsSnapshot;
  copy: Copy;
  locale: Locale;
  href: string;
}) {
  const { policy, balance } = snapshot;
  const figures: { key: string; label: string; minor: number }[] = [
    { key: "available", label: copy.balance.available, minor: balance.availableMinor },
    { key: "pending", label: copy.balance.pending, minor: balance.pendingMinor },
    { key: "paid-out", label: copy.balance.paidOut, minor: balance.paidOutMinor },
    { key: "lifetime", label: copy.balance.lifetime, minor: balance.lifetimeMinor },
  ];
  return (
    <Panel variant="card" className="nf-rewards-earn" data-testid="invite-earnings">
      <p className="nf-rewards-figures__label">{copy.balance.label}</p>
      <h2 className="nf-rewards-earn__headline" data-testid="invite-earnings-headline">
        {fill(copy.earn.headline, { amount: money(policy.rewardPerReferralMinor, locale) })}
      </h2>
      <dl className="nf-rewards-earn__figures">
        {figures.map((f) => (
          <div key={f.key} data-testid={`invite-earnings-${f.key}`}>
            <dt>{f.label}</dt>
            <dd>
              <MoneyFigure minor={f.minor} locale={locale} size="md" kobo="auto" />
            </dd>
          </div>
        ))}
      </dl>
      <div className="nf-rewards-earn__actions">
        <ButtonLink href={href} variant="spark" size="lg" full leadingIcon="hand-coins" data-testid="invite-earnings-open">
          {copy.earn.open}
        </ButtonLink>
      </div>
    </Panel>
  );
}
