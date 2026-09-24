/**
 * THE RENEWAL CLOCK, AS ARITHMETIC. V-93 and V-38.
 *
 * Pure twins of the SQL doors in migration 20260924140800, so the page never
 * offers a control the database would refuse:
 *
 *   - the relist opens 90 days before the tenancy ends (`relist_from_tenancy`);
 *   - the outgoing tenant's account opens 30 days before the end, and only
 *     once the caution is settled (`answer_exit_account`);
 *   - a renewal offer's total is rent plus service charge plus any fee the
 *     lister added, and a fee is flagged because renewal fees are not usual.
 *
 * Calendar days as YYYY-MM-DD strings, Lagos; integer kobo; no division.
 */
import { addDays } from "./model";

export const RELIST_OPENS_DAYS = 90;
export const EXIT_ACCOUNT_OPENS_DAYS = 30;

/** Whole days from `today` to `endsOn`; negative once the tenancy has ended. */
export function daysUntil(endsOn: string, today: string): number {
  return Math.round((Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function relistOpensOn(endsOn: string): string {
  return addDays(endsOn, -RELIST_OPENS_DAYS);
}

export function relistOpen(endsOn: string, today: string, tenantRenewing: boolean): boolean {
  return !tenantRenewing && today >= relistOpensOn(endsOn);
}

export function exitAccountOpen(endsOn: string, today: string, cautionSettled: boolean): boolean {
  return cautionSettled && today >= addDays(endsOn, -EXIT_ACCOUNT_OPENS_DAYS);
}

export type RenewalOffer = {
  rentMinor: number;
  serviceMinor: number | null;
  agencyMinor: number;
  legalMinor: number;
  agreementMinor: number;
};

export function renewalTotal(offer: RenewalOffer): number {
  return offer.rentMinor + (offer.serviceMinor ?? 0) + offer.agencyMinor + offer.legalMinor + offer.agreementMinor;
}

/** True when the lister added a fee to the renewal, which the screen names as unusual. */
export function renewalCarriesFees(offer: RenewalOffer): boolean {
  return offer.agencyMinor + offer.legalMinor + offer.agreementMinor > 0;
}

/** The change in rent from the last let, in kobo: positive is a rise. */
export function rentChange(previousRentMinor: number | null, offer: RenewalOffer): number | null {
  return previousRentMinor === null ? null : offer.rentMinor - previousRentMinor;
}
