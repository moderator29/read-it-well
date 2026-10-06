import "./rewards.css";
import { intlTag, type Dictionary, type Locale } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { IconPlate } from "@/components/ui/IconPlate";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { canWithdraw, type RewardsSnapshot } from "@/lib/referral/rewards";
import { CampaignCard } from "./CampaignCard";
import { InviteLinkCard } from "./InviteLinkCard";
import { RewardsFigures } from "./RewardsFigures";
import { money } from "./format";
import { fill, type RewardsMoneyWords } from "./money-words";

type Copy = Dictionary["experienceRewards"];

export type RewardsHrefs = { referrals: string; history: string; withdraw: string };

/**
 * THE REFERRAL DASHBOARD, MEMBER SIDE (D51). One subject, the Rewards
 * Balance; everything else is quieter or an inner page (D25).
 *
 *   1. The three figures, Available forward, with Withdraw as the one primary
 *      action once Available reaches the minimum.
 *   2. A campaign bonus's progress, only when one is running.
 *   3. The invite link: copy, share sheet, QR.
 *   4. Two doors: the referral list and the rewards history, each its own page.
 *   5. How it is counted: the reward, the monthly cap and the minimum as
 *      figures from `money_policy`, and the sentences from `lib/money/copy.ts`
 *      that say what qualifies and that this is not an investment. The
 *      threshold is stated here before anybody has earned anything (D51).
 *
 * No rate is written in this file. Server-safe; the invite card is the one
 * client leaf.
 */
export function RewardsDashboard({
  snapshot,
  invite,
  copy,
  money: words,
  locale,
  hrefs,
  dismissLabel,
}: {
  snapshot: RewardsSnapshot;
  invite: { url: string; code: string } | null;
  copy: Copy;
  money: RewardsMoneyWords;
  locale: Locale;
  hrefs: RewardsHrefs;
  dismissLabel: string;
}) {
  const { policy, balance } = snapshot;
  const number = new Intl.NumberFormat(intlTag[locale]);
  const reward = money(policy.rewardPerReferralMinor, locale);
  const minimum = money(policy.withdrawMinimumMinor, locale);

  return (
    <div className="nf-rewards" data-testid="rewards-dashboard">
      <RewardsFigures
        balance={balance}
        copy={copy}
        locale={locale}
        note={words.notHeld}
        action={
          canWithdraw(balance, policy) ? (
            <ButtonLink href={hrefs.withdraw} variant="primary" size="lg" full data-testid="rewards-withdraw-link">
              {copy.actions.withdraw}
            </ButtonLink>
          ) : (
            <p className="nf-rewards-note" data-testid="rewards-below-minimum">
              {fill(words.minimum, { minimum })}
            </p>
          )
        }
      />

      {snapshot.campaign ? <CampaignCard campaign={snapshot.campaign} copy={copy.campaign} locale={locale} /> : null}

      {invite ? <InviteLinkCard url={invite.url} code={invite.code} copy={copy.invite} dismissLabel={dismissLabel} /> : null}

      <ListGroup>
        <ListRow
          href={hrefs.referrals}
          leading={
            <IconPlate shape="round" size="sm" tone="brand">
              <UiIcon name="users" size={20} />
            </IconPlate>
          }
          title={copy.actions.referrals}
          value={copy.referralsCount.replace("{count}", number.format(snapshot.referrals.length))}
          chevron
          data-testid="rewards-referrals-row"
        />
        <ListRow
          href={hrefs.history}
          leading={
            <IconPlate shape="round" size="sm">
              <UiIcon name="history" size={20} />
            </IconPlate>
          }
          title={copy.actions.history}
          chevron
          data-testid="rewards-history-row"
        />
      </ListGroup>

      <ListGroup label={copy.policy.label} labelAs="h2">
        <ListRow title={copy.policy.perReferral} value={<span className="nf-rewards-amount">{reward}</span>} data-testid="rewards-policy-reward" />
        <ListRow
          title={copy.policy.monthlyCap}
          value={<span className="nf-rewards-amount">{number.format(policy.monthlyCap)}</span>}
          data-testid="rewards-policy-cap"
        />
        <ListRow title={copy.policy.minimum} value={<span className="nf-rewards-amount">{minimum}</span>} data-testid="rewards-policy-minimum" />
      </ListGroup>
      <div className="grid gap-xs">
        <p className="nf-rewards-note">{fill(words.qualify, { reward, cap: number.format(policy.monthlyCap) })}</p>
        <p className="nf-rewards-note">{words.notInvestment}</p>
      </div>
    </div>
  );
}
