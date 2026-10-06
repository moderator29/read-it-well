import "./rewards.css";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { IconPlate } from "@/components/ui/IconPlate";
import { Panel } from "@/components/ui/Panel";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { PausedProgramme } from "@/lib/referral/rewards";
import { dayLabel } from "./format";

type Copy = Dictionary["experienceRewards"]["pause"];

/**
 * REWARDS ARE PAUSED THIS MONTH (D64), said plainly and never silently.
 *
 * The month's platform budget is reached, so no new referral qualifies until it
 * opens again. Three things are said, in this order:
 *
 *   1. that rewards are paused, and that no new referral can qualify;
 *   2. when they resume, ONLY if the server's read gave a day. Nothing here
 *      works a date out;
 *   3. `earned`, the money sentence from `lib/money/copy.ts` that says what is
 *      already earned is still the member's and is still paid. A pause never
 *      reaches backwards, so the figures, history and withdrawals around this
 *      notice are drawn exactly as they were.
 *
 * `inviteOff` adds the line that stands where the invite link was, on the
 * surfaces that offer it when running (the dashboard, the referral list, the
 * invite hub). The notice itself carries no action: there is nothing to do.
 * Server-safe.
 */
export function RewardsPauseNotice({
  programme,
  copy,
  earned,
  locale,
  inviteOff = false,
}: {
  programme: PausedProgramme;
  copy: Copy;
  earned: string;
  locale: Locale;
  inviteOff?: boolean;
}) {
  const resumes = programme.resumesOn ? dayLabel(programme.resumesOn, locale) : "";
  return (
    <Panel variant="card" className="nf-rewards-pause" aria-label={copy.label} data-testid="rewards-paused">
      <IconPlate shape="round" size="sm" tone="brand">
        <UiIcon name="hourglass" size={20} />
      </IconPlate>
      <div className="nf-rewards-pause__text">
        <h2 className="nf-rewards-pause__title">{copy.title}</h2>
        <p className="nf-rewards-pause__body">
          {copy.body}
          {resumes ? <> {copy.resumes.replace("{date}", resumes)}</> : null}
        </p>
        {inviteOff ? (
          <p className="nf-rewards-pause__body" data-testid="rewards-paused-invite-off">
            {copy.inviteOff}
          </p>
        ) : null}
        <p className="nf-rewards-pause__earned" data-testid="rewards-paused-earned">
          {earned}
        </p>
      </div>
    </Panel>
  );
}
