import type { Dictionary } from "@vallo/i18n/core";
import { TrustTierFan } from "./TrustTierFan";
import { businessTierItems, type BusinessLadderInput } from "./business-tiers";

/**
 * A HOST BUSINESS'S VERIFICATION TIERS, AS THE FAN (north star 14.4: "trust
 * tiers"). The same credential and the same fan as the agent ladder on
 * `/agent/verification`, fed by the host's real ladder read
 * (`getMyBusinessLadder`): the tier the database computed and each rung's
 * meaning to a guest. Server-safe; the fan is the client leaf.
 *
 * Its accessible name carries the business's name, because a host with two
 * businesses has two fans on one page and "Your verification tiers" twice is
 * two controls nobody can tell apart.
 */
export function BusinessTierFan({
  ladder,
  businessName,
  t,
}: {
  ladder: BusinessLadderInput;
  businessName: string;
  t: Dictionary;
}) {
  const f = t.experienceFeatures;
  return (
    <TrustTierFan
      tiers={businessTierItems(ladder)}
      current={ladder.tier}
      copy={{
        selector: `${businessName}, ${f.trustTiers.selector}`,
        position: f.artefact.position,
        tier: f.trustTiers.tier,
        held: f.trustTiers.held,
        notYet: f.trustTiers.notYet,
      }}
    />
  );
}
