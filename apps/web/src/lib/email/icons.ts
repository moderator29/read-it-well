/**
 * THE 3D MARK ON EVERY EMAIL (30 September 2026, founder: "add this icons
 * some in all emails").
 *
 * One of the founder's 3D objects (royal blue clay, one orange accent) sits
 * above each message's headline, the way an app icon sits beside a
 * notification on a lock screen (reference 32). It is decoration and nothing
 * else: the headline under it names the message, so its alt is empty, and a
 * reader with images off loses nothing.
 *
 * PNG, NEVER WEBP. The site serves the cutouts as webp; several mail clients
 * (classic Outlook, older Apple Mail, some webmails) do not draw webp at all.
 * The email copies live in `public/brand/3d/email/<name>.png` (128 px, drawn
 * at 64, so every screen gets 2x) beside `<name>@2x.png` (256 px).
 *
 * THE PLAN AND WHAT IS READY. Every message names the object it is meant to
 * carry (`want`). Only files that exist are ever referenced: `EMAIL_ICON_READY`
 * lists the PNGs on disk, and a message whose object is not ready yet uses a
 * fitting stand-in (`now`) or, when nothing ready fits, carries no mark rather
 * than a wrong one (a wallet on a password reset reads as a money email).
 * When the 3D rollout lands a new PNG, adding its name to `EMAIL_ICON_READY`
 * is the whole change, and `icons.test.ts` fails until somebody does.
 *
 * The five Supabase auth templates carry the same mark, chosen in
 * `scripts/build-auth-emails.mjs` (it cannot import this file) as a pair of
 * wanted object and stand-in, resolved against the files when it runs.
 */

/** Every object an email may carry, ready or not. */
export const EMAIL_ICON_NAMES = [
  // Ready (sliced from the first sheet).
  "buy",
  "rent",
  "pay",
  "list",
  "hotel",
  "shortlet",
  "restaurant",
  "local-talks",
  // From the 3D rollout.
  "bell",
  "assistant",
  "calendar-booked",
  "shield",
  "search",
  "explore",
  "home-verified",
  "villa",
  "city",
  "apartment",
  "land",
  "stay-rated",
  "calendar-pending",
  "card-secure",
  "earnings",
  "handover",
  "coin",
  "keys",
  "verified",
  "home-small",
  "id-check",
  // The third sheet, from the 3D rollout.
  "envelope",
  "phone-code",
  "passcode-lock",
  "receipt",
  "contract",
  "boxes",
  "toolbox",
  "analytics",
  "bank",
  "megaphone",
  "support",
  "team",
  "folder",
  "clock",
  "report-flag",
  "saved-heart",
  "gift",
  "celebrate",
] as const;

export type EmailIconName = (typeof EMAIL_ICON_NAMES)[number];

/**
 * The PNGs that exist in `public/brand/3d/email/`. Add a name here once its
 * file is there; `icons.test.ts` checks every one exists, at both sizes.
 */
export const EMAIL_ICON_READY: ReadonlySet<EmailIconName> = new Set<EmailIconName>([
  // The first eight (re-cut by the rollout from the better sheet).
  "buy",
  "rent",
  "pay",
  "list",
  "hotel",
  "shortlet",
  "restaurant",
  "local-talks",
  // Delivered by the 3D rollout (scripts/brand-3d.mjs).
  "bell",
  "assistant",
  "calendar-booked",
  "shield",
  "search",
  "explore",
  "home-verified",
  "villa",
  "city",
  "apartment",
  "land",
  "stay-rated",
  "calendar-pending",
  "card-secure",
  "earnings",
  "handover",
  "coin",
  "keys",
  "verified",
  "home-small",
  "id-check",
  // The third sheet (sheet 5 of the rollout).
  "envelope",
  "phone-code",
  "passcode-lock",
  "receipt",
  "contract",
  "boxes",
  "toolbox",
  "analytics",
  "bank",
  "megaphone",
  "support",
  "team",
  "folder",
  "clock",
  "report-flag",
  "saved-heart",
  "gift",
  "celebrate",
]);

/** Every message the product sends, by the name its builder goes by. */
export type EmailKind =
  // Account and security
  | "verificationCode"
  | "passwordReset"
  | "passwordChanged"
  | "emailRecoveryOpened"
  | "emailRecoveryCompleted"
  | "newDeviceSignIn"
  | "paymentInstrumentChanged:card"
  | "paymentInstrumentChanged:bank"
  | "deletionStarted"
  | "deletionCompleted"
  | "scamRecall"
  | "staffAccessGranted"
  // Welcome, by the role somebody signed up as
  | "welcome:renter"
  | "welcome:buyer"
  | "welcome:landlord"
  | "welcome:seller"
  | "welcome:agent"
  | "welcome:unstated"
  // Listings, agents and verification
  | "listingSubmitted"
  | "listingApproved"
  | "listingRejected"
  | "listingPassedReview"
  | "listingChangesRequested"
  | "agentApplicationApproved"
  | "agentApplicationRejected"
  | "agentApplicationNeedsMore"
  | "verificationRungPassed"
  | "verificationRungFailed"
  // Enquiries and support
  | "newEnquiry"
  | "supportTicketFiled"
  | "supportReplied"
  // Viewings
  | "inspectionScheduled"
  | "inspectionProposed"
  | "inspectionDeclined"
  | "inspectionWithdrawn"
  | "inspectionCompleted"
  // Agreements and the guarantee
  | "agreementSubmitted"
  | "agreementWaiting"
  | "agreementApproved"
  | "agreementRejected"
  | "agreementCancelled"
  | "guaranteeClaimOpened"
  | "guaranteeClaimDecided"
  // Stays
  | "bookingRequested"
  | "bookingRequestedHost"
  | "bookingConfirmed"
  | "stayArrivalDetails"
  | "bookingCancelled"
  | "bookingRefunded"
  | "refundRequested"
  // Tables
  | "reservationConfirmed"
  | "reservationCancelled"
  // Crypto payments
  | "cryptoPayment";

type Plan = {
  /** The object this message is meant to carry. */
  want: EmailIconName;
  /** What it carries until `want` is ready; null carries nothing meanwhile. */
  now: EmailIconName | null;
};

const p = (want: EmailIconName, now: EmailIconName | null = null): Plan => ({ want, now });

export const EMAIL_ICON_PLAN: Readonly<Record<EmailKind, Plan>> = {
  verificationCode: p("envelope", "shield"),
  passwordReset: p("passcode-lock", "shield"),
  passwordChanged: p("passcode-lock", "shield"),
  emailRecoveryOpened: p("envelope", "id-check"),
  emailRecoveryCompleted: p("envelope", "id-check"),
  newDeviceSignIn: p("passcode-lock", "shield"),
  "paymentInstrumentChanged:card": p("card-secure", "pay"),
  // A payout account change (display only; nothing about payouts changes here).
  "paymentInstrumentChanged:bank": p("bank", "pay"),
  deletionStarted: p("passcode-lock", "shield"),
  deletionCompleted: p("passcode-lock", "shield"),
  // The recall follows a report upheld against an account.
  scamRecall: p("report-flag", "shield"),
  staffAccessGranted: p("id-check"),

  "welcome:renter": p("rent", "rent"),
  "welcome:buyer": p("buy", "buy"),
  "welcome:landlord": p("keys", "list"),
  "welcome:seller": p("home-small", "list"),
  "welcome:agent": p("city", "list"),
  "welcome:unstated": p("explore", "local-talks"),

  // Waiting on review.
  listingSubmitted: p("clock", "list"),
  // The listing is live.
  listingApproved: p("celebrate", "keys"),
  listingRejected: p("list", "list"),
  listingPassedReview: p("home-verified", "list"),
  listingChangesRequested: p("list", "list"),
  agentApplicationApproved: p("verified"),
  agentApplicationRejected: p("id-check"),
  agentApplicationNeedsMore: p("id-check"),
  verificationRungPassed: p("verified"),
  verificationRungFailed: p("id-check"),

  newEnquiry: p("local-talks", "local-talks"),
  supportTicketFiled: p("support", "local-talks"),
  supportReplied: p("support", "local-talks"),

  inspectionScheduled: p("calendar-booked", "rent"),
  inspectionProposed: p("calendar-pending", "rent"),
  inspectionDeclined: p("calendar-pending", "rent"),
  inspectionWithdrawn: p("calendar-pending", "rent"),
  inspectionCompleted: p("home-verified", "rent"),

  agreementSubmitted: p("contract", "calendar-pending"),
  agreementWaiting: p("contract", "calendar-pending"),
  agreementApproved: p("contract", "handover"),
  agreementRejected: p("contract", "home-small"),
  agreementCancelled: p("contract", "home-small"),
  // A claim on the guarantee is money under protection: the shielded wallet.
  guaranteeClaimOpened: p("shield", "pay"),
  guaranteeClaimDecided: p("shield", "pay"),

  bookingRequested: p("calendar-pending", "shortlet"),
  // A host with a request waiting on them: the bell.
  bookingRequestedHost: p("bell", "shortlet"),
  bookingConfirmed: p("calendar-booked", "shortlet"),
  stayArrivalDetails: p("keys", "shortlet"),
  bookingCancelled: p("pay", "pay"),
  // Money coming back to somebody: the open hand with the naira coin.
  bookingRefunded: p("earnings", "pay"),
  refundRequested: p("earnings", "pay"),

  reservationConfirmed: p("restaurant", "restaurant"),
  reservationCancelled: p("restaurant", "restaurant"),

  // The plain coin reads as a blank disc at 64 px; the wallet says payment.
  cryptoPayment: p("pay", "pay"),
};

/** The object a message carries today: its own when ready, else its stand-in. */
export function emailIconFor(kind: EmailKind): EmailIconName | null {
  const plan = EMAIL_ICON_PLAN[kind] as Plan | undefined;
  if (!plan) return null;
  if (EMAIL_ICON_READY.has(plan.want)) return plan.want;
  if (plan.now && EMAIL_ICON_READY.has(plan.now)) return plan.now;
  return null;
}

/** Site path of an email icon (128 px PNG). */
export function emailIconPath(name: EmailIconName): string {
  return `/brand/3d/email/${name}.png`;
}

/** The drawn size, in CSS pixels. The 128 px file gives every screen 2x. */
export const EMAIL_ICON_SIZE = 64;
