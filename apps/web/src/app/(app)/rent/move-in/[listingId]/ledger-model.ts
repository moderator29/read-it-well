import type { Dictionary } from "@vallo/i18n";
import type { Listing } from "@/lib/listings/types";
import { RENT_PERIOD_LABEL, type RentPeriod } from "@/lib/listings/pricing";
import type { AreaComparison, LedgerLine } from "./MoveInLedger";

/** The tenancy period the rent is quoted in; a yearly quote unless said. */
export function rentPeriodOf(listing: Listing): RentPeriod {
  return listing.pricePeriod === "month" || listing.pricePeriod === "quarter"
    ? listing.pricePeriod
    : "year";
}

/** True of a home let by the year, quarter or month, and of nothing else. */
export function isTenancy(listing: Listing): boolean {
  return (
    listing.intent !== "sale" &&
    (listing.pricePeriod === "year" || listing.pricePeriod === "month" || listing.pricePeriod === "quarter")
  );
}

/**
 * Every cost the agent named, as its own row, in the order a tenant meets
 * them. A part they did not name is not a row: nothing here is guessed.
 */
export function ledgerLines(listing: Listing, t: Dictionary): LedgerLine[] {
  const period = rentPeriodOf(listing);
  const lines: LedgerLine[] = [];
  const push = (line: Omit<LedgerLine, "minor"> & { minor: number | undefined }) => {
    if (line.minor === undefined || line.minor === null || line.minor <= 0) return;
    lines.push({ ...line, minor: line.minor });
  };
  push({
    key: "rent",
    icon: "home",
    label: `${t.catalogue.card.rent} (1 ${RENT_PERIOD_LABEL[period].toLowerCase()})`,
    hint: RENT_PERIOD_LABEL[period],
    minor: listing.priceMinor,
  });
  push({
    key: "caution",
    icon: "verified",
    label: "Caution deposit",
    hint: "Held against damage, returned as agreed",
    minor: listing.cautionDepositMinor,
  });
  push({
    key: "service",
    icon: "bolt",
    label: listing.serviceChargePeriod
      ? `Service charge (${RENT_PERIOD_LABEL[listing.serviceChargePeriod].toLowerCase()})`
      : "Service charge",
    hint: "Estate and building upkeep",
    minor: listing.serviceChargeMinor,
  });
  push({ key: "agency", icon: "user", label: "Agency fee", hint: "The agent's own fee", minor: listing.agencyFeeMinor });
  push({ key: "legal", icon: "document", label: "Legal fee", hint: "Documentation and processing", minor: listing.legalFeeMinor });
  push({ key: "agreement", icon: "document", label: "Agreement fee", hint: "The tenancy agreement", minor: listing.agreementFeeMinor });
  return lines;
}

/**
 * The average rent of other rentals in the same area on the same period, or
 * null. Three others is the floor: an "average" of one other listing is that
 * listing's rent wearing a statistic's clothes.
 */
export function areaComparison(listing: Listing, others: Listing[]): AreaComparison | null {
  const period = rentPeriodOf(listing);
  const peers = others.filter(
    (other) =>
      other.id !== listing.id &&
      other.intent !== "sale" &&
      other.priceMinor > 0 &&
      rentPeriodOf(other) === period &&
      other.city === listing.city &&
      (listing.area ? other.area === listing.area : true),
  );
  if (peers.length < 3 || listing.priceMinor <= 0) return null;
  const averageMinor = Math.round(peers.reduce((sum, peer) => sum + peer.priceMinor, 0) / peers.length);
  const deltaPercent = Math.round(((listing.priceMinor - averageMinor) / averageMinor) * 100);
  return { averageMinor, deltaPercent, count: peers.length, period, area: listing.area || listing.city };
}
