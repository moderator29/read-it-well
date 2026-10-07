"use client";

import { CredentialFan, type FanItem } from "./CredentialFan";
import { materialForStep } from "./fan-pose";

/**
 * THE VERIFICATION LADDER'S TIERS AS CREDENTIALS (north star 14.4: "trust
 * tiers"), on `/agent/verification`.
 *
 * Each tier the ladder defines is a credential the agent either holds or does
 * not yet, and the fan lets them take each one in hand and read what it
 * means. The words are the ladder's own (`lib/trust/verification.ts`: the
 * tier name and the rung's meaning), handed in by the server page, so this
 * draws nothing the ladder does not say. "Held" is the tier the database
 * computed (`agents.verification_tier`), never inferred here.
 *
 * MATERIAL BY STANDING, quietly (14.4): the first two tiers matte navy, the
 * third royal, and the fourth, full verification, navy with the warm edge.
 * The tier number and name on each face are what tell them apart; the
 * material only says how far up the ladder it sits.
 */
export type TrustTierItem = {
  step: number;
  name: string;
  meaning: string;
  held: boolean;
};

export function TrustTierFan({
  tiers,
  current,
  copy,
}: {
  tiers: readonly TrustTierItem[];
  /** The tier held now; 0 holds none, and the fan opens on the first. */
  current: number;
  copy: { selector: string; position: string; tier: string; held: string; notYet: string };
}) {
  const items: FanItem[] = tiers.map((tier) => ({
    id: String(tier.step),
    material: materialForStep(tier.step, tiers.length),
    eyebrow: copy.tier.replace("{n}", String(tier.step)),
    title: tier.name,
    glyph: "shield-check",
    state: tier.held ? copy.held : copy.notYet,
  }));
  const byId = new Map(tiers.map((tier) => [String(tier.step), tier]));
  return (
    <CredentialFan
      items={items}
      initialId={String(Math.max(1, current))}
      label={copy.selector}
      positionLabel={copy.position}
      detail={(item) => {
        const tier = byId.get(item.id);
        return tier ? <p className="nf-body-sm text-[var(--nf-content-secondary)]">{tier.meaning}</p> : null;
      }}
    />
  );
}
