/**
 * THE SENTENCE A PRINCIPAL AGREES TO, AND THE RULE FOR WHO MAY BE MESSAGED.
 *
 * Client-safe and pure: the admin consent control renders the sentence, the
 * server action sends the same constant to `record_principal_consent`, which
 * stores it word for word on the mandate row, and the sender checks the rule
 * below before anything leaves the building.
 *
 * ---------------------------------------------------------------------------
 * WHY THE WORDING LIVES HERE AND NOT IN THE DICTIONARY. It is a legal act, not
 * a label. Under the NDPA the lawful basis for messaging somebody who is not a
 * user of the platform is their consent to THIS purpose, THIS frequency and
 * THIS way out, so the words read on the call are the words stored against the
 * number. One wording, versioned by editing this constant and never by
 * translating it, for the same reason the price-check disclaimer lives outside
 * the dictionary. A change here is a new consent: mandates recorded under the
 * old sentence keep the old sentence on their row, which is exactly the
 * record a regulator would ask for.
 *
 * It says what we will send (a question every two weeks, and the rent
 * figures the day a tenant pays), how they answer (a reply or a link), and how
 * they stop. It promises nothing we cannot keep: no "we will never share",
 * because the number is also rung by our own reviewers, and no fixed day.
 */
export const CONSENT_SENTENCE =
  "Vallo will send a short message to this number about every two weeks to ask whether the property is still available, and on the day a tenant pays rent through Vallo, to show you what they paid. You can answer each one by reply or by the link in it, and you can ask us to stop at any time. Do you agree?";

/** What the sender knows about a mandate at the moment of sending. */
export type ConsentState = {
  reviewStatus: "pending" | "approved" | "rejected";
  hasNumber: boolean;
  consentedAt: string | null;
  withdrawnAt: string | null;
  /** YYYY-MM-DD, the mandate's own end date, or null. */
  expiresOn: string | null;
  isDemo: boolean;
};

/**
 * MAY THIS PRINCIPAL BE MESSAGED, RIGHT NOW?
 *
 * The same rule `private.principal_may_be_messaged` holds in the database,
 * held a second time in the sender so a message is refused before a transport
 * is ever called. The database refusal is the one that cannot be forgotten;
 * this one is the one that fails first and says why in the job's report.
 *
 * `today` is a Lagos calendar day, YYYY-MM-DD, injected so a test can pin it.
 */
export function mayMessagePrincipal(state: ConsentState, today: string): boolean {
  if (state.isDemo) return false;
  if (state.reviewStatus !== "approved") return false;
  if (!state.hasNumber) return false;
  if (!state.consentedAt) return false;
  if (state.withdrawnAt && Date.parse(state.withdrawnAt) >= Date.parse(state.consentedAt)) return false;
  if (state.expiresOn && state.expiresOn < today) return false;
  return true;
}

/** The consent state the console shows for one mandate, as a word and a sentence. */
export function consentLine(
  consent: { consentedAt: string | null; withdrawnAt: string | null; readByName: string | null } | null,
  copy: { consentRecorded: string; consentWithdrawn: string; consentNone: string },
  day: (iso: string) => string,
): { state: "none" | "given" | "withdrawn"; line: string } {
  if (!consent || !consent.consentedAt) {
    if (consent?.withdrawnAt) return { state: "withdrawn", line: copy.consentWithdrawn.replace("{date}", day(consent.withdrawnAt)) };
    return { state: "none", line: copy.consentNone };
  }
  if (consent.withdrawnAt && Date.parse(consent.withdrawnAt) >= Date.parse(consent.consentedAt)) {
    return { state: "withdrawn", line: copy.consentWithdrawn.replace("{date}", day(consent.withdrawnAt)) };
  }
  return {
    state: "given",
    line: copy.consentRecorded
      .replace("{date}", day(consent.consentedAt))
      .replace("{name}", consent.readByName ?? ""),
  };
}
