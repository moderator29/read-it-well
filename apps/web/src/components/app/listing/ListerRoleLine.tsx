import type { ListingRole } from "@/lib/supply/roles";
import { fillLister } from "./lister-role";

/**
 * WHO PUT THIS LISTING UP, IN ONE LINE, ON THE SCREEN.
 *
 * This component exists because of a green light that could not see what it
 * reported on. `LISTING_ROLE_SENTENCE` and `LISTING_ROLE_FILTER_LABEL` were
 * written into `lib/supply/roles.ts`, covered by a unit test that asserted
 * they existed and had the right shape, and the track was read as having
 * shipped three listing badges. It had not. Both constants had ZERO CONSUMERS
 * outside their own file and that test. A test that asserts a constant exists
 * is not proof that a label is on a screen, and this file is the difference.
 *
 * ---------------------------------------------------------------------------
 * THREE SENTENCES, BECAUSE THEY ARE THREE DIFFERENT OFFERS
 *
 * "Listed by the owner", "Listed by Chidi Okeke, agent" and "Listed by Acme
 * Properties Ltd" are three different things to the person reading, and
 * telling them apart is the whole point of Track G. The owner sentence names
 * nobody on purpose: the offer is that there is no intermediary, and a name
 * would not add to it.
 *
 * ---------------------------------------------------------------------------
 * THIS IS NOT A TRUST MARK AND IT MUST NEVER BE DRAWN AS ONE
 *
 * `listings.listing_role` is a CLAIM until a member of staff sets
 * `ownership_verified_at` or `mandate_verified_at` beside it. So this is a
 * line of text, in the muted content colour, with no tick, no shield and no
 * badge shape. The verified badge means a checked human and nothing else, and
 * borrowing its shape for an unchecked claim is exactly the failure that had
 * a tick showing in a message thread while every listing behind it correctly
 * showed none.
 *
 * ---------------------------------------------------------------------------
 * `{name}` IS FILLED HERE AND THE SENTENCE IS NOT REBUILT
 *
 * The three strings live in `lib/supply/roles.ts` and this file holds no copy
 * of them, which is the rule for all fifteen surfaces. When the name is
 * missing (the owner sentence never wants one, and an agent read that did not
 * carry one is a real state) the placeholder is dropped rather than printed,
 * because "Listed by {name}, agent" on a real screen is worse than no line.
 */
export function ListerRoleLine({
  role,
  name,
  className,
}: {
  role: ListingRole;
  /** The lister or the firm, when the read carries one. */
  name?: string | null;
  className?: string;
}) {
  const sentence = fillLister(role, name);
  if (sentence === null) return null;
  return (
    <p
      data-testid="lister-role"
      data-role={role}
      className={`nf-caption text-[var(--nf-content-muted)] ${className ?? ""}`.trimEnd()}
    >
      {sentence}
    </p>
  );
}
