import "./rewards.css";
import { intlTag, type Dictionary, type Locale } from "@vallo/i18n/core";
import { Panel } from "@/components/ui/Panel";
import { Progress } from "@/components/ui/Progress";
import { campaignReached, type CampaignProgress } from "@/lib/referral/rewards";
import { dayLabel, money } from "./format";

type Copy = Dictionary["experienceRewards"]["campaign"];

/**
 * A CAMPAIGN BONUS: progress toward one target, and only that (D51).
 *
 * The member's own qualified referrals counted against a target the campaign
 * set, the bonus it pays, and its end as a date. Never a countdown (north
 * star 9: no countdown that is not a real deadline, and even a real one is
 * said as a date here), never a level, a rank or anybody else's progress.
 * Drawn only when the server says a campaign is running. Server-safe.
 */
export function CampaignCard({ campaign, copy, locale }: { campaign: CampaignProgress; copy: Copy; locale: Locale }) {
  const reached = campaignReached(campaign);
  const count = new Intl.NumberFormat(intlTag[locale]);
  const progress = copy.progress.replace("{reached}", count.format(reached)).replace("{target}", count.format(campaign.target));
  return (
    <Panel variant="card" className="nf-rewards-campaign" aria-label={copy.label} data-testid="rewards-campaign">
      <p className="nf-rewards-figures__label">{copy.label}</p>
      <p className="nf-rewards-campaign__name">{campaign.name}</p>
      <Progress value={reached} max={Math.max(1, campaign.target)} label={campaign.name} valueText={progress} tone="brand" size="sm" />
      <p className="nf-rewards-campaign__row">
        <span>{progress}</span>
      </p>
      <p className="nf-rewards-campaign__row">
        <span>{copy.bonus}</span>
        <span className="nf-rewards-amount">{money(campaign.bonusMinor, locale)}</span>
      </p>
      {campaign.endsOn ? (
        <p className="nf-rewards-campaign__row">
          <span>{copy.ends.replace("{date}", dayLabel(campaign.endsOn, locale))}</span>
        </p>
      ) : null}
    </Panel>
  );
}
