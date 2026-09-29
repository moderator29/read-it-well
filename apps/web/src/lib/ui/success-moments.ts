import type { Dictionary } from "@vallo/i18n/core";
import type { FeedbackKind } from "@/lib/ui/feedback";

/**
 * EVERY "IT WORKED" MOMENT, BY NAME (docs/SUCCESS_MOMENTS.md).
 *
 * One registry so a moment's variant, its feel in the hand and its words are
 * decided once, and a call site only says WHICH moment happened. The words
 * live in `packages/i18n/src/locales/en.ts` under `success.moments`; this file
 * pairs each one with how it looks:
 *
 *   success     it happened and it is done: paid, booked, confirmed
 *   submitted   it was accepted and a person decides next: "in review"
 *   approved    somebody else decided in your favour: listing live, documents
 *               approved, agreement approved
 *
 * A pending or unknown payment is NOT a moment here and cannot be named: it
 * keeps `ResultSheet`'s pending state ("Confirming your payment").
 */

export type SuccessVariant = "success" | "submitted" | "approved";

export type SuccessMomentId = keyof Dictionary["success"]["moments"];

export const SUCCESS_VARIANT: Readonly<Record<SuccessMomentId, SuccessVariant>> = {
  stayPaid: "success",
  stayPaidRecorded: "success",
  rentPaid: "success",
  sharePaid: "success",
  moveInPaid: "success",
  cryptoPaid: "success",
  inspectionRequested: "submitted",
  inspectionBooked: "success",
  inspectionReportSubmitted: "success",
  inspectionRecorded: "success",
  agreementDrawn: "success",
  agreementConfirmed: "success",
  agreementInReview: "submitted",
  agreementApprovedRenter: "approved",
  agreementApprovedOwner: "approved",
  claimFiled: "submitted",
  refundRequested: "submitted",
  listingSubmitted: "submitted",
  listingApproved: "approved",
  listingLive: "approved",
  agentApplied: "submitted",
  hostApplied: "submitted",
  registrationFiled: "submitted",
  kycSubmitted: "submitted",
  identityMatched: "approved",
  verificationApproved: "approved",
  ticketFiled: "submitted",
  contactSent: "submitted",
  reportFiled: "submitted",
  stayRequested: "submitted",
  stayHeld: "success",
  tableRequested: "submitted",
  bankAccountAdded: "success",
  payoutAccountAdded: "success",
  accountCreated: "success",
  emailVerified: "success",
  passwordChanged: "success",
  passcodeSet: "success",
  passcodeChanged: "success",
};

/**
 * What each variant says through the hand (lib/ui/feedback.ts). A submission
 * is an ACCEPTED action ("confirm"), not news that something is finished, so
 * it does not borrow the success pattern a settled payment uses.
 */
export const SUCCESS_FEEL: Readonly<Record<SuccessVariant, FeedbackKind>> = {
  success: "success",
  submitted: "confirm",
  approved: "success",
};

export type SuccessCopy = { variant: SuccessVariant; title: string; body: string };

/** The words and the variant for one moment, with `{placeholders}` filled. */
export function successCopy(
  copy: Dictionary["success"],
  id: SuccessMomentId,
  values: Record<string, string> = {},
): SuccessCopy {
  const words = copy.moments[id];
  const fill = (text: string) =>
    Object.entries(values).reduce((out, [key, value]) => out.split(`{${key}}`).join(value), text);
  return { variant: SUCCESS_VARIANT[id], title: fill(words.title), body: fill(words.body) };
}

/* ------------------------------------------------------ the one-shot flag */

/**
 * `?done=<flag>`: a redirect's way of saying "show the success on arrival".
 *
 * The flag only ASKS. The page it lands on checks what the server says (the
 * agreement exists and is yours, the listing really is live) before a sheet
 * opens, and strips the flag with `router.replace` as it opens, so a refresh
 * or a shared link never replays it.
 */
export const DONE_PARAM = "done";

/** Flags a page may be sent with. Kebab case, because they are in a URL. */
export const DONE_FLAGS = {
  "agreement-drawn": "agreementDrawn",
  "listing-approved": "listingApproved",
  "listing-live": "listingLive",
  "account-created": "accountCreated",
  "email-verified": "emailVerified",
  "password-changed": "passwordChanged",
  "passcode-set": "passcodeSet",
  "passcode-changed": "passcodeChanged",
} as const satisfies Record<string, SuccessMomentId>;

export type DoneFlag = keyof typeof DONE_FLAGS;

/**
 * The moments that belong to the ACCOUNT rather than to a record on a page,
 * so the root layout's host may show them wherever they land: a sign-up can
 * finish on /home or on the listing somebody started from. Everything else
 * is shown by the page that can check it.
 */
export const GLOBAL_DONE_FLAGS: readonly DoneFlag[] = [
  "account-created",
  "email-verified",
  "password-changed",
  "passcode-set",
  "passcode-changed",
];

export function isDoneFlag(value: unknown): value is DoneFlag {
  return typeof value === "string" && Object.hasOwn(DONE_FLAGS, value);
}

/** `href` with `?done=<flag>` added, keeping its query and hash. */
export function withDone(href: string, flag: DoneFlag, extra: Record<string, string> = {}): string {
  const hashAt = href.indexOf("#");
  const hash = hashAt === -1 ? "" : href.slice(hashAt);
  const base = hashAt === -1 ? href : href.slice(0, hashAt);
  const queryAt = base.indexOf("?");
  const path = queryAt === -1 ? base : base.slice(0, queryAt);
  const params = new URLSearchParams(queryAt === -1 ? "" : base.slice(queryAt + 1));
  params.set(DONE_PARAM, flag);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return `${path}?${params.toString()}${hash}`;
}

/**
 * The same address with the flag and its companions removed, for
 * `router.replace` once the sheet is up. `also` names the flag's companions
 * (a listing id, a payment reference) so they go with it.
 */
export function withoutDone(href: string, also: readonly string[] = []): string {
  const url = new URL(href, "http://x.invalid");
  url.searchParams.delete(DONE_PARAM);
  for (const key of also) url.searchParams.delete(key);
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash}`;
}

/** The flag in a `searchParams` value, or null. */
export function readDone(value: string | string[] | undefined | null): DoneFlag | null {
  const one = Array.isArray(value) ? value[0] : value;
  return isDoneFlag(one) ? one : null;
}

/* ------------------------------------------------ the imperative doorway */

export const SUCCESS_EVENT = "nf:success";

export type SuccessEventDetail = { flag: DoneFlag };

/**
 * Show an ACCOUNT moment from anywhere on the client, with no navigation:
 * the host in the root layout listens. For the passcode and auth screens,
 * whose owners call this rather than render a sheet of their own. Only the
 * global flags are accepted; a record's moment belongs to its page.
 */
export function showSuccess(flag: DoneFlag): void {
  if (typeof window === "undefined" || !GLOBAL_DONE_FLAGS.includes(flag)) return;
  window.dispatchEvent(new CustomEvent<SuccessEventDetail>(SUCCESS_EVENT, { detail: { flag } }));
}
