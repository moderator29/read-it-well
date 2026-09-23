import type { PersonTier as Tier } from "@/lib/admin/reads/shapes";

/**
 * THE ONE BADGE SLOT IN THE CONSOLE (B-BADGE).
 *
 * Every place the console draws a person's name or avatar puts this beside
 * it: the operator in the rail and the bar (`IdentityBlock`), the audit and
 * alert rows (`AlertList`), and any desk that passes a tier. Desks owned by
 * admin-review and admin-money render `<PersonTier tier={...} />` next to a
 * name, with the tier read by `getPersonTiers` in `lib/admin/reads/shared.ts`.
 *
 * The badge itself is Session A's: the derivation (`public.person_badge`),
 * the artwork and the component (proposed `components/app/badge/PersonBadge`).
 * That component has not landed, so this slot renders NOTHING: blocked on
 * B-BADGE, recorded in the ledger. When it lands, the body of this function
 * becomes `return tier ? <PersonBadge tier={tier} size={size} /> : null;`
 * and every name in the console inherits it. The console never draws its
 * own badge artwork or colours.
 */
export function PersonTier({ tier }: { tier: Tier | null | undefined; size?: "sm" | "md" }) {
  void tier;
  return null;
}
