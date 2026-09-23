/**
 * WHERE A PERSON'S BADGE GOES ON THE MONEY PAGES, AND WHY IT DRAWS NOTHING.
 *
 * The founder's gold and platinum badges are Session A's end to end (scope
 * B-BADGE): the one derivation (`public.person_badge.tier`), the artwork and
 * the one component, proposed as `components/app/badge/PersonBadge.tsx`. This
 * surface reads the tier through its own read and renders that component,
 * never its own artwork or colour and never a tier of its own making.
 *
 * On 23 September the component does not exist yet, so this slot renders
 * NOTHING. The day it lands, the body becomes
 * `return tier ? <PersonBadge tier={tier} size="xs" /> : null;` and every
 * call site is already wired with the real tier. Recorded in the Session B
 * ledger, section 5, as blocked on B-BADGE.
 */
export type BadgeTier = "gold" | "platinum" | null;

export function BadgeSlot({ tier }: { tier: BadgeTier }) {
  void tier;
  return null;
}
