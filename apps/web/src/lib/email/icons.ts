/**
 * THE OBJECT IN EVERY EMAIL'S HEADER, AND THE GLYPHS IN ITS ROWS (north star
 * 16.5, D23 and D29; Session 3, W9, 6 October 2026).
 *
 * WHAT CHANGED, AND WHY. Until today each message carried one of the first
 * 3D rollout's objects (`public/brand/3d/email/`), chosen per message. Those
 * are the glossy generation D29 retired for symbols, and one of them, the
 * receipt, has a dollar sign baked into it, which breaks two rules at once:
 * no text in any asset, and no currency Vallo does not take. So every
 * message now carries a TIER B object, the matte royal-blue symbol set the
 * founder approved (`public/brand/tier-b/`), chosen by the message's FAMILY:
 * the object names what kind of email this is (a wallet for money, an
 * envelope for a code, a scroll for an agreement), the way an app icon sits
 * beside a notification.
 *
 * PNG, NEVER WEBP. Tier B ships as webp, which classic Outlook, older Apple
 * Mail and several webmails do not draw. The email copies are PNGs in
 * `public/brand/email/objects/<name>.png` (128px, drawn at 64, so every
 * screen gets 2x) beside `<name>@2x.png` (256px), made from the tier-b
 * sources without any change to the drawing (W9 report: the build script).
 *
 * THE ALT IS THE FAMILY, A WORD (north star 16.5: "every image carries alt
 * text and a sensible fallback"). With images off the reader sees "Payment"
 * or "Account" in quiet type where the object would be, in a box of the
 * object's size, and the headline under it does the rest. A family word and
 * not the headline, so a screen reader does not read the subject twice.
 *
 * THE LINE GLYPHS in the key-value rows are the product's own UiIcon line
 * tier (stroke on a 24 grid, the family blue), rendered once to PNG at 3x
 * and drawn at 16px. They are decorative beside a label that says the same
 * thing, so their alt is empty: with images off the row is its words.
 *
 * The five Supabase auth templates (`scripts/build-auth-emails.mjs`, not this
 * module) still carry the old marks from `public/brand/3d/email/`, which is
 * why those files stay on disk; moving the generator is request R-24.
 */

/** Every Tier B object an email carries. Each has a PNG pair on disk (icons.test.ts). */
export const EMAIL_OBJECTS = [
  "envelope",
  "padlock",
  "shield-tick",
  "warning-triangle",
  "passport-book",
  "door-open",
  "key-ring",
  "house-heart",
  "people-group",
  "hourglass",
  "rosette",
  "clipboard-list",
  "doc-search",
  "chat-pair",
  "headset",
  "calendar-page",
  "calendar-bolt",
  "scroll-unrolled",
  "scales",
  "bell",
  "cup-saucer",
  "wallet-card",
  "wallet-out",
  "wallet-angled",
  "banknote-fold",
] as const;

export type EmailObject = (typeof EMAIL_OBJECTS)[number];

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
  // Payments and receipts
  | "cryptoPayment"
  | "paymentReceipt";

/**
 * The families, each with the word that stands in for its object when images
 * are off, and the register its mail is drawn in (render.ts):
 *
 *   paper   money and documents, and every receipt: the white sheet stays
 *           white even in a dark-mode client (D23, D28.1)
 *   shell   notification and lifecycle: white here, the product's night in
 *           a dark-mode client
 */
export type EmailFamily =
  | "account"
  | "welcome"
  | "listing"
  | "message"
  | "support"
  | "viewing"
  | "agreement"
  | "stay"
  | "table"
  | "payment";

export type EmailRegister = "paper" | "shell";

export const FAMILY: Readonly<Record<EmailFamily, { alt: string; register: EmailRegister }>> = {
  account: { alt: "Account", register: "shell" },
  welcome: { alt: "Welcome", register: "shell" },
  listing: { alt: "Listing", register: "shell" },
  message: { alt: "Message", register: "shell" },
  support: { alt: "Support", register: "shell" },
  viewing: { alt: "Viewing", register: "shell" },
  agreement: { alt: "Agreement", register: "paper" },
  stay: { alt: "Stay", register: "shell" },
  table: { alt: "Table", register: "shell" },
  payment: { alt: "Payment", register: "paper" },
};

type Plan = { family: EmailFamily; object: EmailObject };
const p = (family: EmailFamily, object: EmailObject): Plan => ({ family, object });

/**
 * Which object and family each message carries. The object names what the
 * message is ABOUT and never claims more than its words: a submission waits
 * (the hourglass), only a passed check carries the tick, and a claim on the
 * Guarantee is the scales, because it is weighed by a person before
 * anything is paid.
 */
export const EMAIL_PLAN: Readonly<Record<EmailKind, Plan>> = {
  verificationCode: p("account", "envelope"),
  passwordReset: p("account", "padlock"),
  passwordChanged: p("account", "padlock"),
  emailRecoveryOpened: p("account", "envelope"),
  emailRecoveryCompleted: p("account", "envelope"),
  newDeviceSignIn: p("account", "padlock"),
  "paymentInstrumentChanged:card": p("account", "wallet-card"),
  /* A payout account change (display only; nothing about payouts changes here). */
  "paymentInstrumentChanged:bank": p("account", "wallet-out"),
  deletionStarted: p("account", "padlock"),
  deletionCompleted: p("account", "padlock"),
  /* The recall follows a report upheld against an account. */
  scamRecall: p("account", "warning-triangle"),
  staffAccessGranted: p("account", "passport-book"),

  "welcome:renter": p("welcome", "key-ring"),
  "welcome:buyer": p("welcome", "house-heart"),
  "welcome:landlord": p("welcome", "key-ring"),
  "welcome:seller": p("welcome", "house-heart"),
  "welcome:agent": p("welcome", "people-group"),
  "welcome:unstated": p("welcome", "door-open"),

  listingSubmitted: p("listing", "hourglass"),
  listingApproved: p("listing", "rosette"),
  listingRejected: p("listing", "clipboard-list"),
  listingPassedReview: p("listing", "shield-tick"),
  listingChangesRequested: p("listing", "clipboard-list"),
  agentApplicationApproved: p("listing", "rosette"),
  agentApplicationRejected: p("listing", "clipboard-list"),
  agentApplicationNeedsMore: p("listing", "doc-search"),
  verificationRungPassed: p("account", "shield-tick"),
  verificationRungFailed: p("account", "doc-search"),

  newEnquiry: p("message", "chat-pair"),
  supportTicketFiled: p("support", "headset"),
  supportReplied: p("support", "headset"),

  inspectionScheduled: p("viewing", "calendar-page"),
  inspectionProposed: p("viewing", "calendar-bolt"),
  inspectionDeclined: p("viewing", "calendar-page"),
  inspectionWithdrawn: p("viewing", "calendar-page"),
  inspectionCompleted: p("viewing", "clipboard-list"),

  agreementSubmitted: p("agreement", "scroll-unrolled"),
  agreementWaiting: p("agreement", "scroll-unrolled"),
  agreementApproved: p("agreement", "scroll-unrolled"),
  agreementRejected: p("agreement", "scroll-unrolled"),
  agreementCancelled: p("agreement", "scroll-unrolled"),
  guaranteeClaimOpened: p("payment", "scales"),
  guaranteeClaimDecided: p("payment", "scales"),

  bookingRequested: p("stay", "hourglass"),
  /* A host with a request waiting on them: the bell. */
  bookingRequestedHost: p("stay", "bell"),
  bookingConfirmed: p("stay", "calendar-page"),
  stayArrivalDetails: p("stay", "key-ring"),
  bookingCancelled: p("stay", "calendar-page"),
  /* Money coming back to somebody. */
  bookingRefunded: p("payment", "banknote-fold"),
  refundRequested: p("payment", "banknote-fold"),

  reservationConfirmed: p("table", "cup-saucer"),
  reservationCancelled: p("table", "cup-saucer"),

  cryptoPayment: p("payment", "wallet-angled"),
  paymentReceipt: p("payment", "wallet-card"),
};

/** The object a message carries, or null for a kind this module does not know. */
export function emailObjectFor(kind: EmailKind): EmailObject | null {
  return (EMAIL_PLAN[kind] as Plan | undefined)?.object ?? null;
}

/** The family a message belongs to, or null for a kind this module does not know. */
export function emailFamilyOf(kind: EmailKind): EmailFamily | null {
  return (EMAIL_PLAN[kind] as Plan | undefined)?.family ?? null;
}

/** Paper for money and documents, the shell for everything else. */
export function emailRegisterOf(kind: EmailKind): EmailRegister {
  const family = emailFamilyOf(kind);
  return family ? FAMILY[family].register : "shell";
}

/** Site path of an object's 128px PNG. */
export function emailObjectPath(name: EmailObject): string {
  return `/brand/email/objects/${name}.png`;
}

/** The drawn size of the header object, in CSS pixels. The 128px file gives 2x. */
export const EMAIL_OBJECT_SIZE = 64;

/**
 * The line glyphs a key-value row may carry, by what the row is about, each
 * a UiIcon line glyph (render it with the build script to add one).
 */
export const EMAIL_GLYPHS = {
  calendar: "calendar-booking",
  people: "users",
  home: "home",
  place: "location",
  money: "banknote",
  receipt: "file-check",
  time: "clock",
  check: "circle-check",
  card: "credit-card",
  shield: "shield-check",
  key: "key",
  document: "file-text",
  bank: "bank",
  info: "info",
  status: "hourglass",
  phone: "phone",
} as const;

export type EmailGlyph = keyof typeof EMAIL_GLYPHS;

/** Site path of a glyph's PNG (48px, drawn at 16, so 3x). */
export function emailGlyphPath(glyph: EmailGlyph): string {
  return `/brand/email/glyphs/${glyph}.png`;
}

export const EMAIL_GLYPH_SIZE = 16;
