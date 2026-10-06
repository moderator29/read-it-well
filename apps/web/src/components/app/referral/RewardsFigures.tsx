import "./rewards.css";
import type { ReactNode } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { Panel } from "@/components/ui/Panel";
import type { RewardsBalance } from "@/lib/referral/rewards";

type Copy = Dictionary["experienceRewards"];

/**
 * THE REWARDS BALANCE, AS THREE FIGURES THAT ARE NEVER MIXED (D51).
 *
 * One subject: Available, the figure a member can withdraw, in the figure face
 * on a Card at the figure radius. Beneath it and visibly quieter, Pending (what
 * is waiting for referrals to qualify) and Earned in total. Misreading pending
 * as available costs somebody a disappointed withdrawal, so the two are never
 * the same size and never side by side at the same weight.
 *
 * `note` is the money sentence that says what this balance is (REWARDS_NOT_HELD
 * from `lib/money/copy.ts`): a debt Vallo owes, not money it holds. It is
 * never called a wallet. `action` is the one primary action, Withdraw, when
 * the balance reaches the minimum. Server-safe.
 */
export function RewardsFigures({
  balance,
  copy,
  locale,
  note,
  action,
}: {
  balance: RewardsBalance;
  copy: Copy;
  locale: Locale;
  note: string;
  action?: ReactNode;
}) {
  const b = copy.balance;
  return (
    <Panel variant="card" className="nf-panel--figure nf-rewards-figures" aria-label={b.label} data-testid="rewards-figures">
      <p className="nf-rewards-figures__label">{b.label}</p>
      <p className="nf-rewards-figures__eyebrow">{b.available}</p>
      <p className="nf-rewards-figures__hero" data-testid="rewards-available">
        <Amount minorUnits={balance.availableMinor} locale={locale} />
      </p>
      <dl className="nf-rewards-figures__pair">
        <div>
          <dt>{b.pending}</dt>
          <dd className="nf-rewards-figures__figure" data-testid="rewards-pending">
            <Amount minorUnits={balance.pendingMinor} locale={locale} />
          </dd>
          <dd className="nf-rewards-figures__hint">{b.pendingHint}</dd>
        </div>
        <div>
          <dt>{b.lifetime}</dt>
          <dd className="nf-rewards-figures__figure" data-testid="rewards-lifetime">
            <Amount minorUnits={balance.lifetimeMinor} locale={locale} />
          </dd>
          <dd className="nf-rewards-figures__hint">{b.lifetimeHint}</dd>
        </div>
      </dl>
      <p className="nf-rewards-figures__note">{note}</p>
      {action ? <div className="nf-rewards-figures__action">{action}</div> : null}
    </Panel>
  );
}
