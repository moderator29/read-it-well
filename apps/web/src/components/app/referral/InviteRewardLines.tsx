import "@/components/app/account/referral.css";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { IconPlate } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { RewardsPolicy } from "@/lib/referral/rewards";
import { runningInviteLines } from "./invite-rewards";

/**
 * WHAT INVITING MEANS WHILE REWARDS RUN, as the invite hub's list under the
 * ticket: what the invited person gets, what the member earns and when, and
 * the monthly budget (`runningInviteLines`). Drawn only for a running
 * programme; the caller decides that from `inviteRewards`. Server-safe.
 */
export function InviteRewardLines({
  policy,
  t,
  locale,
  testId,
}: {
  policy: RewardsPolicy;
  t: Dictionary;
  locale: Locale;
  testId: string;
}) {
  return (
    <ul className="nf-panel nf-panel--card nf-how" aria-label={t.experienceRewards.inviteHub.label} data-testid={testId}>
      {runningInviteLines(policy, t, locale).map((line) => (
        <li key={line.key} className="nf-how__item" data-testid={`invite-rewards-${line.key}`}>
          <IconPlate shape="round" size="sm" tone="brand">
            <UiIcon name={line.icon} size={20} />
          </IconPlate>
          <div className="nf-how__text">
            <h2 className="nf-how__title">{line.title}</h2>
            <p className="nf-how__body">{line.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
