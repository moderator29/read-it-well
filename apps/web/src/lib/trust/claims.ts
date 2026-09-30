/**
 * THE CLAIMS RULE, EXECUTABLE (V-02).
 *
 * A word that promises something ("verified", "checked", "secure", "safe",
 * "guaranteed", "encrypted", "protected", "insured") may appear in copy a
 * person reads only when a mechanism in this codebase makes it true. Every
 * such use is either
 *
 *   - BACKED: it matches an entry below, and the entry names the mechanism
 *     (a column, a policy, a provider, a guard) that makes it true; or
 *   - NOT A CLAIM: a negation ("not protected by us", "we have not checked"),
 *     or the word in its everyday sense ("once you have checked out").
 *
 * Anything else fails `claims.test.ts`, which runs in `npm run lint` and before
 * `npm run build`. Adding a claim means adding its mechanism here, in the same
 * change, where a reviewer can read both.
 *
 * WHEN IT STOPS A BUILD. Because the check is in `prebuild`, a hotfix that
 * adds a sentence with one of these words will not build until the claim is
 * backed. The remedy is one line: add `{ phrase: /the exact words/i,
 * mechanism: "what makes it true" }` to BACKED_CLAIMS below (or reword the
 * sentence). The failure message prints the file, line and sentence. Do not
 * remove the check from `prebuild` to get a build out; a false claim shipped
 * is the thing it exists to stop.
 *
 * The check runs under vitest, so `prebuild` needs the web app's
 * devDependencies installed (a production-only install cannot build).
 *
 * Scope: the app's copy, the four locale catalogues, the auth email templates
 * in supabase/templates, the native shell's offline page and the iOS and
 * Android native strings.
 *
 * Client-safe: plain data and pure functions.
 */

/** The promising words. A hyphen or a dot next to the word means it is part of
    an identifier or a class name (`safe-area`, `nf-badge--verified`,
    `listing.verified`), not a word a person reads. */
export const CLAIM_WORD =
  /(?<![\p{L}\p{N}_.-])(verified|guaranteed?|guarantees|secure|securely|safe|safely|encrypted|checked|protected|insured|instant|instantly)(?![\p{L}\p{N}_-])/giu;

export type BackedClaim = {
  /** Matches the claim in context; everything it matches is accepted. */
  phrase: RegExp;
  /** What makes it true. Named so a reviewer can go and look. */
  mechanism: string;
  /**
   * Set only on a sentence already deleted on the release branch by another
   * change, so this branch's copy of it does not fail here in the meantime.
   * Such an entry is exempt from the "must still match something" check.
   */
  pendingRemoval?: string;
};

const AGENT_KYC =
  "agent_verification_checks rungs decided by an admin on the KYC desk, published as agent_badges.verified; a listing is verified only when !is_demo and its agent holds the badge (lib/listings/supabase-repository.ts)";
const AGENT_APPROVAL =
  "agents rows are written only by admins (policy agents_manage_admin): a lister exists only after a person approved the application";
const LISTING_REVIEW =
  "admin listing review queue (lib/admin/actions.ts) and the owner write guard listings_00_guard_owner_write: a member cannot publish a listing";
const PAYSTACK = "Paystack's hosted checkout: card details are entered on Paystack's page, never on Vallo";
const SUPPLY_CHECKS = "supply verification rows written from the admin supply desk (lib/supply/roles.ts)";

export const BACKED_CLAIMS: readonly BackedClaim[] = [
  /* The verified mark and the words around it. */
  { phrase: /^(?:a )?verified(?: vallo)?(?: agent| host| account| listing)?(?: only)?\.?$/i, mechanism: AGENT_KYC },
  { phrase: /\b(?:identity|address|payout|fully) verified\b/i, mechanism: AGENT_KYC },
  { phrase: /\bverified (?:tick|mark|badge|agent|host|listing|person|stays? by)\b/i, mechanism: AGENT_KYC },
  { phrase: /\bverified(?: is about a person| and third party| means)\b/i, mechanism: AGENT_KYC },
  { phrase: /\b(?:what (?:does )?verified mean|how are agents verified|you are verified|verified:\s*\$\{)/i, mechanism: AGENT_KYC },
  { phrase: /\bcannot be verified yet\b/i, mechanism: AGENT_KYC },
  { phrase: /^checked by a person$/i, mechanism: AGENT_KYC },
  { phrase: /\bthe name vallo checked\b/i, mechanism: AGENT_KYC },
  { phrase: /\bchecked the record on\b|\b(?:registration|mandate) checked\b/i, mechanism: SUPPLY_CHECKS },
  { phrase: /\bhow far the person behind a listing has been checked\b|\beach person is checked on their own\b|\bchecked harder than owners\b/i, mechanism: SUPPLY_CHECKS },
  { phrase: /^address checked$/i, mechanism: "listings.address_verified_at, stamped by an admin (the owner write guard stops a lister writing it)" },
  { phrase: /\bchecked before (?:the listing goes|it went|going) live\b|\bsubmissions waiting to be checked\b/i, mechanism: LISTING_REVIEW },
  { phrase: /\bchecked against the parts\b/i, mechanism: "the move-in total is compared with the sum of its parts in lib/listings (stated vs computed)" },

  /* Payments. */
  { phrase: /\bsecure (?:payment|paystack|card) (?:page|window)\b|\bsecure page in naira\b/i, mechanism: PAYSTACK },
  { phrase: /\bto secure (?:them|it|your)\b/i, mechanism: "the verb 'to secure' (to reserve dates), not a security claim" },

  /* Data protection, in the privacy policy and the docs. */
  { phrase: /\bprotected with row level security\b/i, mechanism: "row level security on public.profiles (profiles_update_own / profiles_select_own)" },
  { phrase: /\bencrypted in transit\b|\bencryption in transit\b/i, mechanism: "HTTPS only with HSTS on www.vallospaces.com; Supabase over TLS" },
  { phrase: /\bhow it is protected\b|\bkeep (?:it|the service) (?:working and )?secure\b|\bused to keep it working and secure\b/i, mechanism: "the privacy policy's own section on protection (encryption in transit, RLS, hashed passwords, licensed payment providers)" },

  /* Everyday senses of "checked". */
  { phrase: /\bchecked out\b/i, mechanism: "a stay's check-out, not a trust claim" },
  { phrase: /\brooms checked\b|^\s+checked$|\bthings that can be checked\b/i, mechanism: "the member's own inspection checklist and evidence, not a platform claim" },
  { phrase: /\bchecked many times\b|\bhave checked that payment\b|\bcould not be checked\b|\buntil you have checked\b/i, mechanism: "payment status polling against the provider, not a trust claim" },
  { phrase: /\bwhat you already checked\b|\breservation is checked against\b|\buntil it is checked\b/i, mechanism: "a process description, not a claim about a listing or a person" },
  { phrase: /\bwhether a purchase is safe\b/i, mechanism: "advice (title decides), not a claim" },
  { phrase: /\bwhat a stay is protected by instead\b/i, mechanism: "a heading over the cancellation policy text on /safety" },

  { phrase: /\bwhether the lister is verified\b|\bcalling everyone verified\b|^,\s*verified$/i, mechanism: `${AGENT_KYC}; a business's ", verified" is businesses.verified, which only staff can set (the DB-01 guard)` },
  { phrase: /\bchecked (?:badge|lister)\b|^verified:\s*$|^checked$|^a person checked\.?$|\bchecked against the uploaded document\b/i, mechanism: AGENT_KYC },
  { phrase: /\bprepare that (?:photo|picture) safely\b/i, mechanism: "the client-side re-encode before upload (strips metadata); a process, not a claim" },
  { phrase: /\btalking to an agent safely\b/i, mechanism: "advice heading in the docs, not a claim" },
  { phrase: /\brather than checked in passing\b|\bwhile it is checked\b|\brooms are checked\b/i, mechanism: "a process description (a database constraint; a report being read; the member's own checklist)" },
  /* The Vallo Guarantee (Track A, 25 September 2026): a product name, not a
     promise that money is guaranteed. What backs it is a real reserve and a
     reviewed, capped claim, both enforced in the database. */
  {
    phrase: /\bguarantee\b/i,
    mechanism:
      "public.guarantee_reserve_entries (append-only ledger funded by the split at settle_booking_charge) and public.admin_decide_guarantee_claim, which caps each claim by the amount paid and the reserve balance under an advisory lock; scope and window in public.money_policy",
  },
  { phrase: /^; Secure$/, mechanism: "the Secure attribute of the theme cookie (lib/theme/theme-client.ts), an HTTP cookie flag, not copy" },

  /* "Instant" (29 September): the word promises speed, so it is a claim word
     now. Instant book is a listing setting, the boolean the lister turns on,
     and the words below only ever name that setting; the assistant's "I
     answer instantly" is its own reply, drawn from local notes with no
     queue in front of it. Anything else "instant" (notifications, payouts,
     approvals) has to name its mechanism here first. */
  {
    phrase: /^instant(?: book)?(?: available| only| against a request)?\.?$|\binstant book only\b/i,
    mechanism: "listings.instant_book (supabase/migrations/20260728152229_listings_core.sql), set by the lister; with it on a guest pays without waiting for the lister to accept",
  },
  { phrase: /\bI answer instantly\b/i, mechanism: "the support assistant answers from its local notes (lib/support/faq.ts) in the same request; anything beyond them goes to the human team, who reply by email" },

  /* Sentences deleted on the release branch by another change. */
  { phrase: /^secure and fast$/i, mechanism: "none", pendingRemoval: "STORE-06, fix/a4 b36e00e2 (already integrated)" },
];

/**
 * "Checked" said of a PERSON'S identity BY A PERSON: a sentence that has
 * "checked", a human actor (a person, by hand, someone at Vallo, our team,
 * real people, we) and an identity subject (ID, identity, documents, the
 * agent, the lister). Backed by the KYC desk and agent approval. A machine
 * doing the checking ("through a processor") is not a human actor, so a
 * sentence that says so is not accepted here.
 */
export const HUMAN_ID_CHECK_MECHANISM = `${AGENT_KYC}; ${AGENT_APPROVAL}`;
const HUMAN_ACTOR =
  /\b(?:a person|by hand|someone at vallo|somebody at vallo|a person here|a person at vallo|our team|real people|a human|we(?: have)?|a named member)\b/i;
const ID_SUBJECT = /\b(?:ID|identity|identification|documents?|agents?|listers?|NIN|the person)\b/i;
function humanIdCheck(sentence: string): boolean {
  return /\bchecked\b/i.test(sentence) && HUMAN_ACTOR.test(sentence) && ID_SUBJECT.test(sentence) && !/\bprocessor\b/i.test(sentence);
}

/** A negation in the same sentence makes the word a disclaimer, not a claim. */
const NEGATED =
  /\b(?:not|never|no|nobody|cannot|can't|isn't|aren't|wasn't|haven't|hasn't|without|nothing)\b[^.!?]{0,60}\b(?:verified|guaranteed?|guarantees|secure|safe|encrypted|checked|protected|insured|instant|instantly)\b|\b(?:verified|guaranteed?|checked|protected|insured|safe)\b[^.!?]{0,12}\b(?:yet|not)\b/gi;

/**
 * The first claim word in `text` that nothing backs, or null.
 * `${...}` expressions inside a template are code, not copy, and are ignored.
 */
export function unbackedClaim(text: string): string | null {
  let copy = text.replace(/\$\{[^{}]*\}/g, " ");
  for (const claim of BACKED_CLAIMS) {
    copy = copy.replace(new RegExp(claim.phrase.source, claim.phrase.flags.includes("g") ? claim.phrase.flags : `${claim.phrase.flags}g`), " ");
  }
  copy = copy
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => (humanIdCheck(sentence) ? sentence.replace(/\bchecked\b/gi, " ") : sentence))
    .join(" ");
  copy = copy.replace(NEGATED, " ");
  const found = new RegExp(CLAIM_WORD.source, CLAIM_WORD.flags).exec(copy);
  return found ? found[1] ?? found[0] : null;
}

/** Whether an allowlist entry still matches the given copy (for stale checks). */
export function claimMatches(claim: BackedClaim, text: string): boolean {
  return claim.phrase.test(text.replace(/\$\{[^{}]*\}/g, " "));
}
