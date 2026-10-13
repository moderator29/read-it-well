/**
 * AN AGREEMENT FOR THE PREVIEW HARNESS, DERIVED, NOT WRITTEN.
 *
 * The agreement behind f3 `TENANCIES[0]`, the unpaid Lekki tenancy, as
 * `readAgreement` would return it to its renter. Every value is read from a
 * committed fixture or follows from one by a rule the product states:
 *
 *   approved, both     `TENANCIES[0]` is payable, and payment opens only once
 *   confirmed          both sides confirm and Vallo approves
 *                      (`PAYMENT_GATE_SENTENCE`, lib/money/copy.ts)
 *   the terms          RENTAL's own fee fields, under the terms' keys the
 *                      agreement stores, and the tenancy's move-in date
 *   the amount         RENTAL's stated move-in total, the same total the
 *                      tenancy charge displays
 *   the renter         _fixtures/people PERSON's name, as the read names a
 *                      party from their profile
 *   the owner          no fixture names who lets this listing, so the read's
 *                      own fallback for an unnamed party
 *   the ids            the tenancy's inspection and listing; the agreement's
 *                      own id is this fixture's
 *
 * WHAT IS EMPTY: no events (no fixture dates them, so the track is undated),
 * one version (the first; nothing records an amendment), no claims and no
 * claim window (the Guarantee is retired), nothing paid. `updatedAt` is empty
 * because no fixture dates the agreement and this page never draws it.
 */
import { UNNAMED_OWNER, type AgreementDetail } from "@/lib/agreements/queries";
import { RENTAL, TENANCIES } from "./fixtures";
import { PERSON } from "../_fixtures/people";

const charge = TENANCIES[0]!;

export const AGREEMENT_ID = "00000000-0000-4000-8000-00000000f3a1";

const terms: Record<string, unknown> = { move_in: charge.moveIn };
if (RENTAL.priceMinor) terms.rent_minor = RENTAL.priceMinor;
if (RENTAL.cautionDepositMinor) terms.caution_minor = RENTAL.cautionDepositMinor;
if (RENTAL.serviceChargeMinor) terms.service_minor = RENTAL.serviceChargeMinor;
if (RENTAL.agencyFeeMinor) terms.agency_minor = RENTAL.agencyFeeMinor;
if (RENTAL.legalFeeMinor) terms.legal_minor = RENTAL.legalFeeMinor;
if (RENTAL.agreementFeeMinor) terms.agreement_fee_minor = RENTAL.agreementFeeMinor;

export const AGREEMENT: AgreementDetail = {
  id: AGREEMENT_ID,
  kind: "rent",
  status: "approved",
  listingId: charge.listingId,
  subjectHref: `/listing/${charge.listingId}`,
  listingTitle: charge.title,
  amountMinor: RENTAL.moveInCostMinor ?? 0,
  role: "renter",
  updatedAt: "",
  termsVersion: 1,
  terms,
  inspectionId: charge.inspectionId,
  bookingId: null,
  renterName: PERSON.name,
  ownerName: UNNAMED_OWNER,
  youConfirmedCurrent: true,
  otherConfirmedCurrent: true,
  decisionReason: null,
  submittedAt: null,
  decidedAt: null,
  paidAt: null,
  claimWindow: null,
  events: [],
  claims: [],
};
