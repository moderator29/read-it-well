import type { Dictionary } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { RENT_PERIOD_LABEL, type RentPeriod } from "@/lib/listings/pricing";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * The cost lines a Nigerian tenant actually meets, and which of them the
 * lister has declared.
 *
 * PURE, AND IN ITS OWN FILE SO IT CAN BE ASSERTED. The honesty rule of
 * HANDOFF 09 section 4.3 lives entirely in the shape this returns: an
 * UNDECLARED cost carries no `minor` at all and is drawn with the words "Not
 * declared", while a DECLARED ZERO carries 0 and is drawn as "No agency fee",
 * which is the direct-from-owner argument in one line. Those are two different
 * facts and nothing downstream may collapse them. `move-in-lines.test.ts`
 * holds them apart; the component in `ListingMoveIn.tsx` only paints what this
 * decides.
 */

export type Part = {
  key: string;
  label: string;
  /** The basis: the rent period, the service-charge period, what it is for. */
  basis?: string;
  /** Who ends up with the money. Quiet, and only where we honestly know. */
  keeper?: string;
  icon: BrandIconName;
  /** Kobo, or undefined when the lister declared nothing. */
  minor?: number;
};

/**
 * The parts, in the order a tenant meets them.
 *
 * Deliberately built from the `Listing` view rather than by calling
 * `moveInParts`, which takes raw Postgres columns. Same order, and now every
 * line in the order appears whether or not it was declared, because the
 * silence is itself the finding a renter needs.
 */
/**
 * The eight columns this function reads, and nothing else.
 *
 * WIDENED FROM `Listing` SO THE WIZARD CAN REUSE THE RULE RATHER THAN COPY IT.
 * `GOVERNING-08` screen two is drawn twice on this platform: once for the
 * searcher on the listing page, and once for the agent inside the listing
 * wizard, under "What will a tenant actually pay?". The agent's copy is a
 * form in progress and has no `Listing` to hand. The alternative was a second
 * implementation of the declared / undeclared / declared-zero distinction,
 * and the whole reason this file exists is that the distinction may live in
 * exactly one place. `Listing` satisfies this shape, so no existing caller
 * changes.
 */
export type MoveInFacts = Pick<
  Listing,
  | "priceMinor"
  | "pricePeriod"
  | "agencyFeeMinor"
  | "legalFeeMinor"
  | "agreementFeeMinor"
  | "cautionDepositMinor"
  | "serviceChargeMinor"
  | "serviceChargePeriod"
>;

export function moveInLines(listing: MoveInFacts, copy: Dictionary["moveIn"]): Part[] {
  const rentPeriod: RentPeriod =
    listing.pricePeriod === "month" || listing.pricePeriod === "quarter"
      ? listing.pricePeriod
      : "year";

  const servicePeriod = listing.serviceChargePeriod;

  return [
    {
      key: "rent",
      label: copy.rent,
      basis: RENT_PERIOD_LABEL[rentPeriod].toLowerCase(),
      keeper: copy.keptByLister,
      icon: "keys-home",
      minor: listing.priceMinor > 0 ? listing.priceMinor : undefined,
    },
    {
      key: "agency",
      label: copy.agencyFee,
      keeper: copy.keptByAgent,
      icon: "person-card",
      minor: listing.agencyFeeMinor,
    },
    {
      key: "legal",
      label: copy.legalFee,
      keeper: copy.keptByAgent,
      /* NOT `contract-sign` and NOT `doc-review`, which read better and are
         both in the 23 transaction marks that ship a LIGHT TWIN. Beside five
         untwinned objects they drew as pale frosted marks on a white row while
         their neighbours kept the navy chip, which is the founder's own
         `home-light-black-icon-plates-as-shipped.jpg` defect in its mirror.
         A set of objects drawn side by side is all twinned or none. */
      icon: "doc-shield",
      minor: listing.legalFeeMinor,
    },
    {
      key: "agreement",
      label: copy.agreementFee,
      keeper: copy.keptByAgent,
      icon: "doc-home",
      minor: listing.agreementFeeMinor,
    },
    {
      key: "caution",
      label: copy.cautionDeposit,
      basis: copy.cautionBasis,
      keeper: copy.keptByLister,
      icon: "shield-check",
      minor: listing.cautionDepositMinor,
    },
    {
      key: "service",
      label: copy.serviceCharge,
      basis: servicePeriod ? RENT_PERIOD_LABEL[servicePeriod].toLowerCase() : undefined,
      keeper: copy.keptByEstate,
      icon: "manage-ring",
      minor: listing.serviceChargeMinor,
    },
  ];
}
