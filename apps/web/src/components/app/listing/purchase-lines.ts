import type { Dictionary } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import type { Part } from "./move-in-lines";

/**
 * The cost lines a Nigerian BUYER actually meets, and which of them the lister
 * has declared.
 *
 * PURE, AND IN ITS OWN FILE SO IT CAN BE ASSERTED, exactly as `move-in-lines.ts`
 * is on the tenancy side. It is that file's twin and it deliberately returns
 * that file's `Part`, because the honesty rule is one rule and not two: an
 * UNDECLARED cost carries no `minor` at all and is drawn with the words "Not
 * declared", while a DECLARED ZERO carries 0 and is drawn as "No agency fee".
 * Those are two different facts and nothing downstream may collapse them.
 * `purchase-lines.test.ts` holds them apart; `ListingPurchase.tsx` only paints
 * what this decides.
 *
 * WHY IT EXISTS AT ALL. The tenancy side has had an honest cost model since
 * August. The sale side had an asking price, a tenure and a sale status, which
 * is the same silence in a much bigger currency: agency and legal are
 * conventionally five per cent each, and Governor's consent, stamp duty and
 * registration run to several per cent more of the value of the land, so a
 * buyer planning around the asking price meets a number they had not budgeted
 * for after they are committed. Buying is the one place a Nigerian is most
 * often surprised by a figure, and it was the one place this platform could
 * not show them one.
 *
 * NOT ONE FIGURE HERE IS CALCULATED, although four of the six have a
 * conventional percentage attached. A rate that is usually five per cent is
 * not five per cent, the consent charge depends on the property and on whoever
 * assesses it, and a number this platform worked out and printed as a fact
 * would be an invented number. The lister states what they charge, or the line
 * says nobody did.
 *
 * ONE DIFFERENCE FROM THE TENANCY MODEL AND IT IS EASY TO GET BACKWARDS. THE
 * ASKING PRICE IS ONE OF THE PARTS. A move-in total sits beside the rent; a
 * purchase total INCLUDES the price, because the price is the largest thing a
 * buyer has to find.
 */

/**
 * The parts, in the order a buyer meets them: what the seller wants, what the
 * two professionals want, then the three the state wants and nobody can
 * negotiate.
 *
 * Built from the `Listing` view rather than from raw Postgres columns, and
 * every line in the order appears whether or not it was declared, because the
 * silence is itself the finding a buyer needs.
 */
export function purchaseLines(listing: Listing, copy: Dictionary["purchase"]): Part[] {
  return [
    {
      key: "price",
      label: copy.askingPrice,
      keeper: copy.keptBySeller,
      icon: "keys-home",
      /* A sale listing with a zero asking price has not declared a price, it
         has an empty field, and a property is not being given away. Treated as
         undeclared for the same reason the rent line treats a zero headline as
         undeclared rather than as free rent. */
      minor: listing.salePriceMinor !== undefined && listing.salePriceMinor > 0
        ? listing.salePriceMinor
        : undefined,
    },
    {
      key: "agency",
      label: copy.agencyFee,
      keeper: copy.keptByAgent,
      icon: "person-card",
      minor: listing.saleAgencyFeeMinor,
    },
    {
      key: "legal",
      label: copy.legalFee,
      keeper: copy.keptByAgent,
      icon: "doc-shield",
      minor: listing.saleLegalFeeMinor,
    },
    {
      key: "consent",
      label: copy.governorsConsent,
      basis: copy.consentBasis,
      keeper: copy.keptByState,
      icon: "doc-lock",
      minor: listing.governorsConsentFeeMinor,
    },
    {
      key: "stamp",
      label: copy.stampDuty,
      keeper: copy.keptByState,
      icon: "doc-home",
      minor: listing.stampDutyMinor,
    },
    {
      key: "registration",
      label: copy.surveyRegistration,
      keeper: copy.keptByState,
      /* `land-plot`, `doc-lock`, `doc-home`, `doc-shield`, `person-card` and
         `keys-home` are all OUTSIDE the 23 objects that ship a light twin, so
         this row is untwinned throughout. A set of objects drawn side by side
         is all twinned or none: mixing them draws one pale frosted mark beside
         five navy chips on paper and looks perfectly correct at night. */
      icon: "land-plot",
      minor: listing.surveyRegistrationFeeMinor,
    },
  ];
}
