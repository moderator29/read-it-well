import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { Listing } from "@/lib/listings/types";
import { RENT_PERIOD_LABEL, type RentPeriod } from "@/lib/listings/pricing";
import type { AreaComparison, LedgerLine } from "./MoveInLedger";
import { feeShares, formatBps, type FeeKey } from "@/lib/listings/fee-share";

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
export function ledgerLines(listing: Listing, t: Dictionary, locale: Locale = "en"): LedgerLine[] {
  const period = rentPeriodOf(listing);
  const lines: LedgerLine[] = [];
  const push = (line: Omit<LedgerLine, "minor"> & { minor: number | undefined }) => {
    if (line.minor === undefined || line.minor === null || line.minor <= 0) return;
    lines.push({ ...line, minor: line.minor });
  };
  /* "Rent (1 year)" over "₦12,000,000 × 1 year", as the render prints it:
     the label names the line and the qualifier shows the arithmetic behind
     the figure on the right. The money goes through `formatMoney` from the
     kobo on the row, never through a string built here. */
  push({
    key: "rent",
    icon: "home",
    label: `${t.catalogue.card.rent} (1 ${period})`,
    hint: `${formatMoney(listing.priceMinor, locale, listing.currency)} × 1 ${period}`,
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
  /* V-12: each fee paid to the agent carries its share of a year's rent,
     in integer basis points, beside what it is for. */
  const shares = feeShares(listing);
  const withShare = (hint: string, key: FeeKey) => {
    const share = shares?.each[key];
    return share
      ? `${hint}, ${t.trustVisible.fees.shareOfRent.replace("{share}", formatBps(share.bps, locale))}`
      : hint;
  };
  push({ key: "agency", icon: "user", label: "Agency fee", hint: withShare("The agent's own fee", "agency"), minor: listing.agencyFeeMinor });
  push({ key: "legal", icon: "document", label: "Legal fee", hint: withShare("Documentation and processing", "legal"), minor: listing.legalFeeMinor });
  push({ key: "agreement", icon: "document", label: "Agreement fee", hint: withShare("The tenancy agreement", "agreement"), minor: listing.agreementFeeMinor });
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
