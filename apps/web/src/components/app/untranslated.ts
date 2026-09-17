/**
 * Every string in this owner's scope that a translator has not seen yet.
 *
 * ---------------------------------------------------------------------------
 * WHY ONE FILE RATHER THAN THREE.
 *
 * These blocks belong to three unrelated surfaces: the escrow desk, the
 * identity review queue and the verification screen an applicant reads. They
 * are gathered here for exactly one reason, which is that translating them is
 * one job and hunting them is three. The alternative - a `const` beside each
 * consumer, as they were - is how a platform that ships in four languages ends
 * up with a screen that is English on Tuesdays: nobody can answer "what is left"
 * without reading every file.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAKES THIS A STAGING POST AND NOT A SECOND DICTIONARY.
 *
 * It is written to be deleted. Every block below names the dictionary path it
 * is going to, the consumers read it through a lookup that checks the
 * dictionary FIRST, and the day the keys land in all four locales this file
 * stops being consulted without a call site changing. `ADMIN_COLUMN_WORDS` in
 * `app/admin/_components/copy.ts` is the same arrangement, staged a sprint
 * earlier, and is deliberately left where it is rather than moved here: it is
 * already wired and moving working code to tidy a report is not a fix.
 *
 * Nothing new should be added here. A new string goes in the dictionary.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE THREE WERE THE LAST ONES.
 *
 * Each had a reason to look like it did not need translating, and each reason
 * was wrong. The escrow states looked like database values, and they are not:
 * "Agreed, not funded" is a sentence somebody wrote. The document kinds looked
 * like a developer's enum, and an operator reads them all day. And `KycStatus`
 * looked like a component rather than copy, because its strings are constants
 * at the bottom of the file rather than props - so it is the most-read screen
 * in the supply-side funnel and the only one still entirely in English.
 */

import type { Database } from "@/lib/supabase/database.types";

/* ------------------------------------------------------------------ escrow */

/**
 * `public.escrow_state`, in words, for the chips on `/admin/escrow` and for the
 * filter row above them.
 *
 * Destination: `t.admin.escrow.state.<VALUE>`.
 *
 * INITIATED is the one that needs care in translation. It means both sides have
 * agreed and no money has moved, which is not "pending" and not "waiting": it
 * is a promise with nothing behind it yet, and an operator reading the wrong
 * word there will think the platform is holding money it is not.
 */
/*
 * Typed against the generated enum rather than `Record<string, string>`.
 *
 * `/admin/escrow` renders `STATE_LABEL[escrow.state] ?? escrow.state`, so a
 * value with no word here reaches an operator as the raw column. That fallback
 * is unreachable today only because this map happens to be complete, and
 * "happens to be" is the condition every one of F2-060's four chips was in
 * before somebody added a value. `Record<EscrowState, string>` makes the ninth
 * escrow state a compile error in this file instead of `RELEASE_DENIED` in a
 * chip on the dispute desk.
 */
export const ESCROW_STATE_WORDS: Record<
  Database["public"]["Enums"]["escrow_state"],
  string
> = {
  INITIATED: "Agreed, not funded",
  FUNDED: "Funded",
  HELD: "Held",
  RELEASE_REQUESTED: "Release asked for",
  RELEASED: "Released",
  REFUNDED: "Refunded",
  DISPUTED: "In dispute",
  RESOLVED: "Ruled on",
};

/* ------------------------------------------------------- identity documents */

/**
 * What kind of document this is. Destination: `t.admin.kyc.documentKind.<value>`.
 */
export const KYC_DOCUMENT_KIND_WORDS: Record<string, string> = {
  identity: "Government issued ID",
  address: "Proof of address",
  business: "Business document",
};

/**
 * Which document of that kind. Destination: `t.admin.kyc.documentSubtype.<value>`.
 *
 * NIN CARD IS THE ONE TO WATCH. It is a Nigerian instrument with an official
 * name, and "NIN card or slip" covers both the plastic card and the paper slip
 * people are actually issued. A translation that renders only one of the two
 * will read, to somebody holding the other, as though we do not accept theirs.
 * CAC is likewise a proper noun and does not translate.
 */
export const KYC_DOCUMENT_SUBTYPE_WORDS: Record<string, string> = {
  passport: "International passport",
  drivers_licence: "Driver's licence",
  nin_card: "NIN card or slip",
  voters_card: "Permanent voter's card",
  utility_bill: "Utility bill",
  bank_statement: "Bank statement",
  tenancy_agreement: "Tenancy agreement",
  cac_certificate: "CAC certificate",
  tax_certificate: "Tax certificate",
  business_address_proof: "Proof of business address",
};

/* ------------------------------------------ the applicant's own status screen */

/**
 * `components/verification/KycStatus.tsx`, in full.
 *
 * Destination: `t.verification.status.*`.
 *
 * THE REJECTION AND THE REQUEST ARE THE TWO THAT MATTER. Both are read by
 * somebody who has been stopped from earning, and both carry the reviewer's own
 * words underneath them, so the frame around those words has to be plain enough
 * that the reader does not have to work out whether the platform or the
 * reviewer is speaking. `fixLabel` is a label followed by a sentence, so it
 * keeps its colon in English and may not want one in another script.
 *
 * `suspendedFix` says what will NOT work before it says what will, on purpose:
 * somebody whose account is stopped will otherwise spend an afternoon
 * resubmitting documents that cannot lift a suspension.
 */
export const KYC_STATUS_WORDS = {
  pendingPill: "In review",
  pendingTitle: "We are checking your documents",
  pendingBody:
    "A person reads every submission by hand. Most decisions come back within one working day, and we email you either way. You can keep drafting listings while you wait.",
  submittedPrefix: "Sent",

  approvedPill: "Verified",
  approvedTitle: "You are verified",
  approvedBody:
    "Your listings can go live, and the verified mark now shows on your profile and beside your name in every conversation.",

  rejectedPill: "Not approved",
  rejectedTitle: "We could not verify this",
  retry: "Send it again",

  moreInfoPill: "Over to you",
  moreInfoTitle: "We need one more thing from you",
  moreInfoContinue: "Send what was asked for",

  suspendedPill: "Stopped",
  suspendedTitle: "This account is stopped",
  suspendedFix:
    "Nothing you send here will lift this, because it is a decision about the account rather than about a document. Talk to our team and they will tell you what it would take.",
  getHelp: "Talk to our team",

  fixLabel: "What to do:",
} as const;
