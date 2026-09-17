/**
 * What is left of a staging post that is being dismantled.
 *
 * ---------------------------------------------------------------------------
 * ONE OF THE THREE BLOCKS HAS GONE, AND THAT IS THE POINT OF THE FILE.
 *
 * This held three: the escrow states, the identity document kinds, and every
 * string on the applicant's own verification screen. The last of those was the
 * one that mattered most and it is gone: `t.verification.status` exists in all
 * four locales and `components/verification/KycStatus.tsx` reads it directly, so
 * an agent applying to trade on a Nigerian marketplace no longer meets their own
 * verification status in English whatever language they chose.
 *
 * It was staged here because `packages/i18n` was another owner's file. It is not
 * any more, so the remaining two blocks are next rather than permanent, and
 * their destinations are named on each one.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAKES THIS A STAGING POST AND NOT A SECOND DICTIONARY.
 *
 * It is written to be deleted. Each block names the dictionary path it is going
 * to, and each consumer reads it through a lookup that checks the dictionary
 * FIRST, so the day its keys land the block stops being consulted without a
 * call site changing.
 *
 * `ADMIN_COLUMN_WORDS` in `app/admin/_components/copy.ts` was the same
 * arrangement and its keys landed, so it was deleted rather than moved here.
 * That is the shape every block in this file is meant to take on its way out.
 *
 * Nothing new should be added here. A new string goes in the dictionary.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE LOOKED LIKE THEY DID NOT NEED TRANSLATING, WHICH IS THE LESSON.
 *
 * The escrow states looked like database values, and they are not: "Agreed, not
 * funded" is a sentence somebody wrote. The document kinds looked like a
 * developer's enum, and an operator reads them all day. And the verification
 * strings looked like part of a component rather than copy, because they were
 * fifteen `const`s at the foot of their own file, which is exactly why the
 * most-read screen in the supply-side funnel was the last one still entirely in
 * English.
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
