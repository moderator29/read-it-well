import "./rewards.css";
import type { ReactNode } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { MoneyFigure } from "@/components/money/kit";
import { Panel } from "@/components/ui/Panel";
import type { RewardsBalance } from "@/lib/referral/rewards";

type Copy = Dictionary["experienceRewards"];

/**
 * THE REWARDS BALANCE, AS THREE FIGURES THAT ARE NEVER MIXED (D51).
 *
 * One subject: Available, the figure a member can withdraw, huge on the
 * platinum object (D74, GOVERNING-plasma-rewards-home.jpg) with the naira
 * sign in the metal's grey, and under it the one action or the pill that
 * says how far there is to go. Beneath, on the raised card and visibly
 * quieter, Earned in total and Pending, split by a hairline. Misreading
 * pending as available costs somebody a disappointed withdrawal, so the two
 * are never the same size and never on the same object.
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
    <div className="nf-rewards-figures-wrap" role="group" aria-label={b.label} data-testid="rewards-figures">
      <section className="nf-rewards-figures nf-rewards-figures--platinum">
        <span className="nf-mcard__sheen" aria-hidden="true" />
        <p className="nf-rewards-figures__label">{b.label}</p>
        <p className="nf-rewards-figures__eyebrow">{b.available}</p>
        <p className="nf-rewards-figures__hero" data-testid="rewards-available">
          <MoneyFigure minor={balance.availableMinor} locale={locale} size="hero" kobo="auto" />
        </p>
        {action ? <div className="nf-rewards-figures__action">{action}</div> : null}
      </section>
      <Panel variant="card" className="nf-rewards-alltime">
        <dl className="nf-rewards-figures__pair">
          <div>
            <dt>{b.lifetime}</dt>
            <dd className="nf-rewards-figures__figure" data-testid="rewards-lifetime">
              <MoneyFigure minor={balance.lifetimeMinor} locale={locale} size="md" kobo="auto" />
            </dd>
            <dd className="nf-rewards-figures__hint">{b.lifetimeHint}</dd>
          </div>
          <div>
            <dt>{b.pending}</dt>
            <dd className="nf-rewards-figures__figure" data-testid="rewards-pending">
              <MoneyFigure minor={balance.pendingMinor} locale={locale} size="md" kobo="auto" />
            </dd>
            <dd className="nf-rewards-figures__hint">{b.pendingHint}</dd>
          </div>
        </dl>
        <p className="nf-rewards-figures__note">{note}</p>
      </Panel>
    </div>
  );
}
