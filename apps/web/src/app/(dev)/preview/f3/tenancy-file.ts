/**
 * A TENANCY FILE FOR THE PREVIEW HARNESS, DERIVED, NOT WRITTEN.
 *
 * Every value below is read from a committed fixture or computed by the
 * product's own code from one; nothing is typed in by hand. It is the file the
 * real read (`getTenancyFile`) would return for f3 `TENANCIES[0]`, the unpaid
 * Lekki tenancy, viewed by its tenant:
 *
 *   the tenancy        TENANCIES[0]: id from its fileHref, title, area, city,
 *                      move-in, period, unpaid
 *   the listing        RENTAL, the same listing (TENANCIES[0].listingId):
 *                      bedrooms, state, and the move-in parts, run through
 *                      `ledgerFromListing`, the same ledger the charge uses
 *   the dates          `tenancyEnd` and `keptUntil` (lib/tenancy/model), the
 *                      labels through `formatMoneyDate`, as the read does
 *   the state code     session-b/sweep-orphans STATES, by the listing's state
 *   the tenant         _fixtures/people PERSON through `firstNameAndInitial`,
 *                      as the read names a tenant
 *
 * WHAT IS EMPTY, AND WHY THAT IS TRUE RATHER THAN MISSING: the tenancy is
 * unpaid, so there are no receipts, no caution record yet (it opens when the
 * move-in payment settles, hence `cautionPending`), no reports, no pinned
 * messages, no promise snapshot and no receipt code. The lister is not named,
 * because no fixture says who lets this listing. A paid tenancy with a caution
 * owed back (the state the demand letter needs) would need a receipt
 * reference, a caution obligation and report rows that no fixture holds, so it
 * is not built here.
 */
import type { TenancyFile } from "@/lib/tenancy/queries";
import { ledgerFromListing } from "@/lib/rent/ledger";
import { keptUntil, tenancyEnd } from "@/lib/tenancy/model";
import { formatMoneyDate } from "@/lib/money/dates";
import { firstNameAndInitial } from "@/lib/after-gate/public-place-model";
import { formatMoney } from "@vallo/i18n/core";
import { RENTAL, TENANCIES } from "./fixtures";
import { STATES } from "../session-b/sweep-orphans/fixtures";
import { PERSON } from "../_fixtures/people";

const charge = TENANCIES[0]!;
const id = charge.fileHref.split("/").pop()!;
const period = charge.rentPeriod;
const endsOn = tenancyEnd(charge.moveIn, period);
const day = (value: string) => formatMoneyDate(value, "en") ?? value;
const ledger = ledgerFromListing({
  rent_amount_minor: RENTAL.priceMinor ?? null,
  rent_period: RENTAL.pricePeriod ?? null,
  caution_deposit_minor: RENTAL.cautionDepositMinor ?? null,
  service_charge_minor: RENTAL.serviceChargeMinor ?? null,
  service_charge_period: RENTAL.serviceChargePeriod ?? null,
  agency_fee_minor: RENTAL.agencyFeeMinor ?? null,
  legal_fee_minor: RENTAL.legalFeeMinor ?? null,
  agreement_fee_minor: RENTAL.agreementFeeMinor ?? null,
  total_move_in_cost_minor: RENTAL.moveInCostStated ? (RENTAL.moveInCostMinor ?? null) : null,
});
const money = (minor: number) => formatMoney(minor, "en");

export const TENANCY_FILE: TenancyFile = {
  id,
  viewer: "tenant",
  title: charge.title,
  area: [charge.area, charge.city].join(", "),
  place: {
    area: RENTAL.area ?? null,
    city: RENTAL.city ?? null,
    stateCode: STATES.find((state) => state.name === RENTAL.state)?.code ?? null,
  },
  bedrooms: RENTAL.bedrooms ?? null,
  listerName: null,
  tenantName: firstNameAndInitial(PERSON.name),
  moveIn: charge.moveIn,
  moveInLabel: day(charge.moveIn),
  endsOn,
  endsOnLabel: day(endsOn),
  keptUntilLabel: day(keptUntil(charge.moveIn, period)),
  rentPeriod: period,
  paid: charge.paid,
  ended: false,
  void: false,
  lines: (ledger?.lines ?? []).map((line) => ({ label: line.label, display: money(line.minor) })),
  total: money(ledger?.totalMinor ?? 0),
  receipts: [],
  caution: null,
  cautionPending: (RENTAL.cautionDepositMinor ?? 0) > 0,
  tenantId: PERSON.id,
  snapshot: null,
  viewing: null,
  reports: [],
  pins: [],
  pinCandidates: [],
  renewal: {
    daysLeft: 0,
    offer: null,
    rentMinor: RENTAL.priceMinor ?? null,
    serviceMinor: RENTAL.serviceChargeMinor ?? null,
    answer: null,
    relistOpen: false,
    relistOpensOnLabel: "",
    successorId: null,
    exitOpen: false,
    exitAnswered: false,
    unavailable: false,
  },
  flatmates: {
    rows: [],
    leadShare: money(ledger?.totalMinor ?? 0),
    leadCautionPart: null,
    leadPaid: false,
    leadRefund: null,
    locked: false,
    cancellable: false,
    unavailable: false,
  },
  receiptCode: null,
};
