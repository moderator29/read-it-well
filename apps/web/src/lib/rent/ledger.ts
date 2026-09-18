import { moveInParts, moveInTotal, type MoveInColumns, type MoveInPart } from "../listings/pricing";

/**
 * The move-in ledger: what a tenant pays to take the keys, in integer kobo.
 *
 * Pure. The same arithmetic `components/app/listing/ListingMoveIn` prints and
 * `private.open_rent_charge` charges, written once more here so a test can
 * hold the three side by side: the lister's stated total when there is one,
 * else the sum of the parts they named. A stated zero is a part ("no agency
 * fee" is a fact); an unstated part is not a part. Nothing here divides,
 * rounds or touches a float: kobo in, kobo out, and a total that is not a
 * positive integer is refused as no charge at all.
 */

export type RentLedgerLine = MoveInPart;

export type RentLedger = {
  lines: RentLedgerLine[];
  totalMinor: number;
  /** True when the lister stated the total; false when it is the sum of parts. */
  stated: boolean;
  /** True when the total is at least the sum of the parts shown beside it. */
  consistent: boolean;
};

/** The columns the charge reads, as `rent_payments` stores them. */
export type RentChargeColumns = {
  rent_minor: number | null;
  rent_period: string | null;
  caution_minor: number | null;
  service_minor: number | null;
  agency_minor: number | null;
  legal_minor: number | null;
  agreement_minor: number | null;
  total_minor: number;
  total_stated: boolean;
};

function isKobo(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Build the ledger from a listing's own columns. Null when nothing is stated. */
export function ledgerFromListing(row: MoveInColumns): RentLedger | null {
  const lines = moveInParts(row).filter((part) => isKobo(part.minor));
  const total = moveInTotal(row);
  if (!isKobo(total.minor) || total.minor <= 0) return null;
  const sum = lines.reduce((acc, part) => acc + part.minor, 0);
  return {
    lines,
    totalMinor: total.minor,
    stated: total.stated,
    consistent: total.minor >= sum,
  };
}

/**
 * The ledger as the charge froze it. The charge stores the six parts by name
 * rather than the listing's columns, so a lister editing a fee after the
 * tenant opened the payment cannot move the figure under them.
 */
export function ledgerFromCharge(row: RentChargeColumns): RentLedger | null {
  const columns: MoveInColumns = {
    rent_amount_minor: row.rent_minor,
    rent_period: row.rent_period,
    caution_deposit_minor: row.caution_minor,
    service_charge_minor: row.service_minor,
    service_charge_period: null,
    agency_fee_minor: row.agency_minor,
    legal_fee_minor: row.legal_minor,
    agreement_fee_minor: row.agreement_minor,
    total_move_in_cost_minor: row.total_stated ? row.total_minor : null,
  };
  const built = ledgerFromListing(columns);
  if (!built) return null;
  // The charged figure is the stored one, whatever the parts add up to now.
  if (!isKobo(row.total_minor) || row.total_minor <= 0) return null;
  const sum = built.lines.reduce((acc, part) => acc + part.minor, 0);
  return {
    lines: built.lines,
    totalMinor: row.total_minor,
    stated: row.total_stated,
    consistent: row.total_minor >= sum,
  };
}
