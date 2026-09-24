import { formatDate, formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import { eddStage, type EddReview } from "./edd";

/**
 * SCUML items 20 and 15: an EDD review as words, for the lanes. Pure. Money
 * in kobo through formatMoney; dates in Lagos time.
 */
const LAGOS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
};

export function when(iso: string, locale: Locale): string {
  return formatDate(new Date(iso), locale, LAGOS);
}

export function eddCardView(review: EddReview, viewerId: string, t: Dictionary, locale: Locale) {
  const l = t.compliancePep.lane;
  const sources = l.source as Record<string, string>;
  const source = sources[review.sourceTable];
  const heading = `${review.name}: ${l.reason[review.reason]}${source ? ` (${source})` : ""}`;
  const lines = [l.raised.replace("{date}", when(review.raisedAt, locale))];
  if (review.amountMinor !== null && review.reason === "transaction") {
    lines.push(l.amount.replace("{amount}", formatMoney(review.amountMinor, locale)));
  }
  const d = review.decision;
  let decisionLine: string | null = null;
  if (d) {
    const outcome = d.outcome === "cleared" ? l.cleared : l.refer;
    decisionLine = d.approvedAt
      ? `${l.sourceOfFunds}: ${d.sourceOfFunds}. ${outcome}. ${l.approvedBy
          .replace("{who}", d.approvedByName ?? "")
          .replace("{date}", when(d.approvedAt, locale))}`
      : `${l.sourceOfFunds}: ${d.sourceOfFunds}. ${l.decided
          .replace("{who}", d.decidedByName)
          .replace("{date}", when(d.decidedAt, locale))
          .replace("{outcome}", outcome)}`;
  }
  return {
    reviewId: review.id,
    item: review.item,
    stage: eddStage(review, viewerId),
    heading,
    lines,
    decisionId: d?.id ?? null,
    decisionLine,
  };
}
