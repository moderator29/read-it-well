import "./rewards.css";
import { intlTag, type Dictionary, type Locale } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { IconPlate } from "@/components/ui/IconPlate";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { canWithdraw, type RewardsSnapshot } from "@/lib/referral/rewards";
import { REWARDS_WITHDRAW_NOT_OPEN } from "@/lib/money/copy";
import { CampaignCard } from "./CampaignCard";
import { EarnCard } from "./EarnSummary";
import { ReferralRows } from "./ReferralList";
import { qualifySentence } from "./invite-rewards";
import { InviteLinkCard } from "./InviteLinkCard";
import { RewardsFigures } from "./RewardsFigures";
import { RewardsPauseNotice } from "./RewardsPauseNotice";
import { MoneyCurve, type CurveRange } from "@/components/money/MoneyCurve";
import { MoneyExplainer } from "@/components/money/MoneyExplainer";
import { MoneyFigure } from "@/components/money/kit";
import { money } from "./format";
import { fill, type RewardsMoneyWords } from "./money-words";

type Copy = Dictionary["experienceRewards"];

const EARNED_RANGES: CurveRange[] = [
  { key: "30", label: "30 days", days: 30, caption: "Earned in the last 30 days" },
  { key: "90", label: "90 days", days: 90, caption: "Earned in the last 90 days" },
  { key: "365", label: "12 months", days: 365, caption: "Earned in the last 12 months" },
];

export type RewardsHrefs = { referrals: string; history: string; withdraw: string };

/** How many people the dashboard lists before "See everyone you invited". */
const PEOPLE_SHOWN = 5;

/**
 * THE REFERRAL DASHBOARD, MEMBER SIDE (D51). One subject, the Rewards
 * Balance; everything else is quieter or an inner page (D25).
 *
 *   1. The figures, Available forward (Pending, Paid out and Earned in total
 *      quieter), with Withdraw always there: the one primary action once
 *      withdrawals are open and Available reaches the minimum, and while they
 *      are not open, said beside it (`REWARDS_WITHDRAW_NOT_OPEN`, D85).
 *   1a. How you earn (D85): the live campaign's reward for each friend who
 *      signs up fully, what that means under it, and the review window. Then
 *      the first people invited, each with where they stand.
 *   2. A campaign bonus's progress, only when one is running.
 *   3. The invite link: copy, share sheet, QR.
 *   4. Two doors: the referral list and the rewards history, each its own page.
 *   5. How it is counted: the reward, the monthly cap and the minimum as
 *      figures from `money_policy`, and the sentences from `lib/money/copy.ts`
 *      that say what qualifies and that this is not an investment. The
 *      threshold is stated here before anybody has earned anything (D51).
 *
 * PAUSED (D64). When the month's platform budget is reached the programme
 * pauses, and this screen stops inviting under a reward promise. The pause
 * notice comes first; the invite card (copy, share sheet, QR), the campaign
 * bonus and the per-referral reward, the monthly count and the qualify
 * sentence are all withdrawn, because each of them promises a reward for a
 * referral that cannot qualify now. Everything already earned is untouched:
 * the three figures, Withdraw, the referral list, the history, the minimum
 * and the sentence that this is not an investment draw exactly as before, and
 * `pausedEarned` (from `lib/money/copy.ts`) says it is still paid.
 *
 * No rate is written in this file. Server-safe; the invite card is the one
 * client leaf.
 */
export function RewardsDashboard({
  snapshot,
  invite,
  copy,
  money: words,
  pausedEarned,
  locale,
  hrefs,
  dismissLabel,
  now,
}: {
  snapshot: RewardsSnapshot;
  invite: { url: string; code: string } | null;
  copy: Copy;
  money: RewardsMoneyWords;
  /** The money sentence a pause carries: what is already earned is still paid. */
  pausedEarned: string;
  locale: Locale;
  hrefs: RewardsHrefs;
  dismissLabel: string;
  /** The server's clock at render. With it, the earned curve (reference 5) is drawn from the history. */
  now?: number;
}) {
  const { policy, balance } = snapshot;
  const number = new Intl.NumberFormat(intlTag[locale]);
  const reward = money(policy.rewardPerReferralMinor, locale);
  const minimum = money(policy.withdrawMinimumMinor, locale);
  const paused = snapshot.programme.state === "paused" ? snapshot.programme : null;
  /* What was earned, from the history the read returned: referrals and
     bonuses that are done, each as it landed. Nothing projected. */
  const earned = snapshot.history.filter((h) => (h.kind === "referral" || h.kind === "bonus") && h.state === "done").map((h) => ({ at: h.at, minor: h.amountMinor }));

  return (
    <div className="nf-rewards" data-testid="rewards-dashboard" data-programme={snapshot.programme.state}>
      {paused ? null : (
        <MoneyExplainer
          storageKey="nf-explainer-rewards-v1"
          name={copy.title}
          testId="rewards-explainer"
          panels={[
            {
              key: "earn",
              title: fill(copy.earn.headline, { amount: reward }),
              body: qualifySentence(policy, locale),
              screenTone: "platinum",
              screen: (
                <>
                  <span className="nf-frag__label">{copy.balance.available}</span>
                  <MoneyFigure minor={balance.availableMinor} locale={locale} size="lg" kobo="auto" />
                </>
              ),
              fragment: (
                <div className="nf-frag nf-frag--card">
                  <span className="nf-frag__row">
                    <span>{copy.title}</span>
                  </span>
                  <span className="nf-frag__split">
                    <span>
                      <span className="nf-frag__label">{copy.policy.perReferral}</span>
                      <MoneyFigure minor={policy.rewardPerReferralMinor} locale={locale} size="md" kobo="auto" />
                    </span>
                    <span>
                      <span className="nf-frag__label">{copy.policy.monthlyCap}</span>
                      <span className="nf-mfig nf-mfig--md nf-numeric">{number.format(policy.monthlyCap)}</span>
                    </span>
                  </span>
                </div>
              ),
            },
            {
              key: "withdraw",
              title: "Withdraw to your bank",
              body: fill(words.minimum, { minimum }),
              fragment: (
                <div className="nf-frag">
                  <span className="nf-frag__pill">{copy.balance.available}</span>
                  <MoneyFigure minor={balance.availableMinor} locale={locale} size="lg" kobo="auto" />
                  <span className="nf-frag__line">{copy.policy.minimum}: {minimum}</span>
                </div>
              ),
            },
          ]}
        />
      )}
      {paused ? <RewardsPauseNotice programme={paused} copy={copy.pause} earned={pausedEarned} locale={locale} inviteOff /> : null}

      <RewardsFigures
        balance={balance}
        copy={copy}
        locale={locale}
        note={words.notHeld}
        action={
          /* D85: Withdraw is always there. While withdrawals are not open it
             says so beside it (no date, nothing earned is lost); once open it
             is the one primary action when Available reaches the minimum. */
          <div className="grid gap-xs">
            <ButtonLink
              href={hrefs.withdraw}
              variant={snapshot.payoutsEnabled && canWithdraw(balance, policy) ? "primary" : "secondary"}
              size="lg"
              full
              data-testid="rewards-withdraw-link"
            >
              {copy.actions.withdraw}
            </ButtonLink>
            {!snapshot.payoutsEnabled ? (
              <p className="nf-rewards-note" data-testid="rewards-withdraw-not-open">
                {REWARDS_WITHDRAW_NOT_OPEN}
              </p>
            ) : canWithdraw(balance, policy) ? null : (
              <p className="nf-rewards-note" data-testid="rewards-below-minimum">
                {fill(words.minimum, { minimum })}
              </p>
            )}
          </div>
        }
      />

      {now !== undefined && earned.length > 0 ? (
        <div className="nf-curve-card">
          <MoneyCurve events={earned} ranges={EARNED_RANGES} now={now} locale={locale} label="Range" testId="rewards-curve" />
        </div>
      ) : null}

      {paused || policy.rewardPerReferralMinor <= 0 ? null : <EarnCard snapshot={snapshot} copy={copy} locale={locale} />}

      {snapshot.campaign && !paused ? <CampaignCard campaign={snapshot.campaign} copy={copy.campaign} locale={locale} /> : null}

      {invite && !paused ? <InviteLinkCard url={invite.url} code={invite.code} copy={copy.invite} dismissLabel={dismissLabel} /> : null}

      {snapshot.referrals.length > 0 ? (
        <ReferralRows
          rows={snapshot.referrals.slice(0, PEOPLE_SHOWN)}
          copy={copy.referrals}
          locale={locale}
          label={copy.earn.people}
          more={snapshot.referrals.length > PEOPLE_SHOWN ? { href: hrefs.referrals, label: copy.earn.seeAll } : null}
        />
      ) : null}

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
        {paused ? null : (
          <ListRow title={copy.policy.perReferral} value={<span className="nf-rewards-amount">{reward}</span>} data-testid="rewards-policy-reward" />
        )}
        {paused ? null : (
          <ListRow
            title={copy.policy.monthlyCap}
            value={<span className="nf-rewards-amount">{number.format(policy.monthlyCap)}</span>}
            data-testid="rewards-policy-cap"
          />
        )}
        <ListRow title={copy.policy.minimum} value={<span className="nf-rewards-amount">{minimum}</span>} data-testid="rewards-policy-minimum" />
      </ListGroup>
      <div className="grid gap-xs">
        {paused ? null : <p className="nf-rewards-note">{qualifySentence(policy, locale)}</p>}
        <p className="nf-rewards-note">{words.notInvestment}</p>
      </div>
    </div>
  );
}
