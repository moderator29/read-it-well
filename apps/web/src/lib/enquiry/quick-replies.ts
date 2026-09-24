import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import type { Listing } from "../listings/types";

/**
 * V-72: THE QUICK-REPLY TRAY. Sentences a lister sends twenty times a day,
 * written once from the listing's own facts.
 *
 * The move-in reply is the one that matters: the total and every part the
 * lister STATED, in the fixed order the card uses, money only through
 * `formatMoney`. An unstated part is absent, never zero. When the lister gave
 * no total, the sum of the parts is a floor and the sentence says "at least".
 * A listing with no stated money at all gets no move-in reply rather than
 * one that invents a figure.
 *
 * Viewing windows (V-94) will replace the open "when would you like to view"
 * with the lister's own windows; until then it asks.
 */

export type QuickReply = { key: string; label: string; text: string };

type Copy = Dictionary["frontDoor"]["desk"]["quick"];

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? values[key]! : whole));
}

type MoneyFacts = Pick<
  Listing,
  | "intent"
  | "priceMinor"
  | "pricePeriod"
  | "moveInCostMinor"
  | "moveInCostStated"
  | "cautionDepositMinor"
  | "serviceChargeMinor"
  | "agencyFeeMinor"
  | "legalFeeMinor"
  | "agreementFeeMinor"
>;

/** The move-in sentence, or null when the listing states nothing to quote. */
export function moveInReply(listing: MoneyFacts, copy: Copy, locale: Locale): string | null {
  if (listing.intent === "sale") return null;
  const money = (minor: number) => formatMoney(minor, locale);
  const parts: string[] = [];
  const period =
    listing.pricePeriod === "month" || listing.pricePeriod === "quarter" || listing.pricePeriod === "year"
      ? listing.pricePeriod
      : null;
  if (period !== null && Number.isFinite(listing.priceMinor) && listing.priceMinor > 0) {
    parts.push(fill(copy.rent, { amount: money(listing.priceMinor), period: copy.periods[period] }));
  }
  const add = (template: string, minor: number | undefined) => {
    if (minor !== undefined && minor !== null && Number.isFinite(minor)) parts.push(fill(template, { amount: money(minor) }));
  };
  add(copy.caution, listing.cautionDepositMinor);
  add(copy.service, listing.serviceChargeMinor);
  add(copy.agency, listing.agencyFeeMinor);
  add(copy.legal, listing.legalFeeMinor);
  add(copy.agreement, listing.agreementFeeMinor);

  const total = listing.moveInCostMinor;
  if (total === undefined || total === null || !Number.isFinite(total) || total <= 0 || parts.length === 0) return null;
  return fill(listing.moveInCostStated ? copy.moveIn : copy.moveInFrom, { total: money(total), parts: parts.join(", ") });
}

/** The tray for one listing thread, in the order a lister reaches for them. */
export function quickReplies(listing: MoneyFacts | null, copy: Copy, locale: Locale): QuickReply[] {
  const replies: QuickReply[] = [];
  const moveIn = listing ? moveInReply(listing, copy, locale) : null;
  if (moveIn) replies.push({ key: "move_in", label: copy.moveInLabel, text: moveIn });
  replies.push({ key: "viewing", label: copy.viewingLabel, text: copy.viewing });
  replies.push({ key: "available", label: copy.availableLabel, text: copy.available });
  replies.push({ key: "let", label: copy.letLabel, text: copy.let });
  return replies;
}
