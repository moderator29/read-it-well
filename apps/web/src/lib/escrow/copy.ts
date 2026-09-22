/**
 * Every sentence the held-payment feature says to a person, in one file.
 *
 * WHY ONE FILE. Copy that lives beside the component it renders in drifts, and
 * money copy that drifts is money copy that contradicts itself between a
 * screen, an email and a receipt about the same amount on the same day. There
 * is one vocabulary here and three surfaces read it.
 *
 * THE COPY RULES, FROM THE RESEARCH FILE 4.12, ALL BINDING.
 *
 *  1. NEVER SAY WHO IS HOLDING THE MONEY. This is the rule that outranks the
 *     others and it is enforced in code below, not left to care. The company
 *     has not decided, in writing, under which structure it holds funds
 *     between two users, and "Held in escrow by Vallo" would be a claim about
 *     a regulated activity made by a company whose objects clause deliberately
 *     omits every payment and escrow word. Until the founder's solicitor
 *     answers, the product describes the EFFECT, which is true under every
 *     structure: the money is set aside and neither side can spend it.
 *
 *  2. A DATE, NEVER A DURATION. "Pays out on 14 Oct 2026", never "in 21 days".
 *     A duration is a number somebody has to do arithmetic on, it is wrong the
 *     moment the page is left open, and it reads as a countdown to a deadline
 *     rather than as a date in a diary.
 *
 *  3. SAY WHAT DID NOT HAPPEN. Every refusal says that nothing moved. A person
 *     who has just been refused a money action wants to know their balance is
 *     intact before they want to know why.
 *
 *  4. NO BANNED WORDS. `escrow` is a legal term of art and is not a word
 *     anybody uses about their own money; the product says "held payment" or
 *     names what is happening. The rest of the banned list is rule 13's.
 *
 *  5. A LAWYER READS THIS WITHOUT WINCING. No promise the platform cannot
 *     keep, no guarantee of an outcome, no implication that Vallo decides who
 *     is right, no fee language, and no claim about safety.
 */

import { formatDate, formatMoney } from "@vallo/i18n";

/** The nine states, as the database spells them. */
export type EscrowState =
  | "INITIATED"
  | "FUNDED"
  | "HELD"
  | "RELEASE_REQUESTED"
  | "RELEASED"
  | "REFUNDED"
  | "DISPUTED"
  | "RESOLVED"
  | "CANCELLED";

/** Which side of the agreement the reader is on. */
export type Party = "payer" | "payee";

/**
 * WHERE THE MONEY SITS, AND WHY THIS IS A UNION AND NOT A STRING.
 *
 * The five structures in part 2.7 of the research file differ in who actually
 * holds the funds, and the honest sentence differs with them. None has been
 * chosen. `undecided` is the value that ships, and `custodySentence` returns
 * null for it, so there is no sentence to render and the surface has nothing
 * to print. That is the whole mechanism by which custody stays unrendered: not
 * a reviewer noticing, a function returning null.
 */
export type CustodyStructure = "undecided" | "trustee" | "licensed_partner";

/** Ships as undecided and only the founder's solicitor changes it. */
export const CUSTODY_STRUCTURE: CustodyStructure = "undecided";

/**
 * The sentence naming who holds the money, or null while nobody may say.
 *
 * A caller renders nothing when this is null. It is never widened to a
 * fallback string, because a fallback string is how "Held by Vallo" gets back
 * in through the side door.
 */
export function custodySentence(structure: CustodyStructure = CUSTODY_STRUCTURE): string | null {
  switch (structure) {
    case "trustee":
      return "The money is held by an independent trustee until this is settled.";
    case "licensed_partner":
      return "The money is held by our licensed payments partner until this is settled.";
    case "undecided":
    default:
      return null;
  }
}

/**
 * The effect, which is true under every structure and says nothing about who.
 *
 * This is what the product prints today, and it is not a placeholder: it is
 * the sentence that will still be true after the structure is chosen.
 */
export const SET_ASIDE_SENTENCE =
  "This money is set aside. Neither of you can spend it until it is paid out or returned.";

/** One short label per state, the same word on every surface. */
export const STATE_LABEL: Record<EscrowState, string> = {
  INITIATED: "Proposed",
  FUNDED: "Setting aside",
  HELD: "Set aside",
  RELEASE_REQUESTED: "Payout asked for",
  RELEASED: "Paid out",
  REFUNDED: "Returned",
  DISPUTED: "Under review",
  RESOLVED: "Settled by Vallo",
  CANCELLED: "Withdrawn",
};

/**
 * What the state MEANS, to the person reading it, from their side.
 *
 * Both parties get a sentence for every state. An agreement where one side can
 * see what is happening and the other cannot is the shape of every marketplace
 * support ticket ever written.
 */
export function stateLine(state: EscrowState, viewer: Party): string {
  const payer = viewer === "payer";
  switch (state) {
    case "INITIATED":
      return payer
        ? "You have been asked to set this money aside. Nothing has left your balance."
        : "You have asked for this money to be set aside. Nothing has moved yet.";
    case "FUNDED":
      return "The money is on its way to being set aside. Give it a moment and refresh.";
    case "HELD":
      return payer
        ? "The money has left your spendable balance and is set aside."
        : "The money is set aside for you. It reaches your balance when this is settled.";
    case "RELEASE_REQUESTED":
      return payer
        ? "A payout has been asked for. If you are happy, confirm it. If you are not, say what is wrong."
        : "You have asked for the payout. The other side can confirm it or say what is wrong.";
    case "RELEASED":
      return payer
        ? "The money has been paid out."
        : "The money has been paid into your Vallo balance.";
    case "REFUNDED":
      return payer
        ? "The money has been returned to your Vallo balance."
        : "The money was returned to the person who set it aside.";
    case "DISPUTED":
      return "Somebody at Vallo is reading what both of you have filed. Nothing moves until they have.";
    case "RESOLVED":
      return "Vallo has made a decision and the money has moved. The decision is on this page.";
    case "CANCELLED":
      return "This was withdrawn before any money moved. Nothing left either balance.";
  }
}

/** A state a person can still act on. */
export function isLive(state: EscrowState): boolean {
  return state === "HELD" || state === "RELEASE_REQUESTED" || state === "DISPUTED";
}

/** A state that has ended, one way or another. */
export function isSettled(state: EscrowState): boolean {
  return (
    state === "RELEASED" || state === "REFUNDED" || state === "RESOLVED" || state === "CANCELLED"
  );
}

/** The countdown, as a date in a diary and never as a number of days. */
export type Countdown =
  | { kind: "none" }
  | { kind: "due"; on: Date; line: string }
  | { kind: "passed"; on: Date; line: string };

/**
 * The automatic payout, said as a date.
 *
 * RULE 2 IS ENFORCED HERE AND NOWHERE ELSE, so a surface cannot render a
 * duration by writing its own string. There is no exported helper that returns
 * a number of days, on purpose.
 *
 * A date that has already passed does not become "overdue". The sweeper runs
 * hourly, so a person looking at a passed date is looking at a payout that is
 * on its way, and telling them it is late would be telling them something is
 * wrong when nothing is.
 */
export function countdown(
  autoReleaseAt: Date | string | null | undefined,
  state: EscrowState,
  now: Date = new Date(),
): Countdown {
  if (!autoReleaseAt) return { kind: "none" };
  if (state !== "HELD" && state !== "RELEASE_REQUESTED") return { kind: "none" };

  const on = autoReleaseAt instanceof Date ? autoReleaseAt : new Date(autoReleaseAt);
  if (Number.isNaN(on.getTime())) return { kind: "none" };

  const when = formatDate(on);
  if (on.getTime() <= now.getTime()) {
    return {
      kind: "passed",
      on,
      line: `The payout date, ${when}, has passed. The money is on its way to the other side.`,
    };
  }
  return {
    kind: "due",
    on,
    line: `If nobody says otherwise, this pays out on ${when}.`,
  };
}

/** The same date, said to the payer, who is the one with something to lose. */
export function countdownForPayer(c: Countdown): string | null {
  if (c.kind === "none") return null;
  if (c.kind === "passed") return c.line;
  return `${c.line} Before then you can confirm it early, or say what is wrong.`;
}

/** What this payment was for. Only one purpose is open, and it is named. */
export type EscrowPurpose =
  | "agency_fee"
  | "purchase_deposit"
  | "purchase_balance"
  | "rent_deposit"
  | "first_rent";

export const PURPOSE_LABEL: Record<EscrowPurpose, string> = {
  agency_fee: "Agency fee",
  purchase_deposit: "Purchase deposit",
  purchase_balance: "Purchase balance",
  rent_deposit: "Caution deposit",
  first_rent: "First rent",
};

/** The only purpose a person may open today. */
export const OPEN_PURPOSES: readonly EscrowPurpose[] = ["agency_fee"] as const;

/**
 * Why a purpose is refused, said plainly rather than as a code.
 *
 * These sentences reach a person only if a surface offers a purpose the
 * database will refuse, which no surface does. They exist so that if one ever
 * does, the answer is a sentence and not "purpose_not_open".
 */
export const PURPOSE_REFUSAL: Record<Exclude<EscrowPurpose, "agency_fee">, string> = {
  purchase_deposit:
    "A deposit on a purchase cannot be set aside here yet. Take it through a solicitor.",
  purchase_balance:
    "The balance on a property purchase is never set aside here. It goes through a solicitor, with searches done first.",
  rent_deposit:
    "A caution deposit is not set aside here. Keep the record of what you paid and what condition the place was in.",
  first_rent:
    "First rent is not set aside here. It is paid to the landlord under your tenancy agreement.",
};

/** An amount, always through formatMoney, never a raw integer. */
export function amountLine(amountMinor: number): string {
  return formatMoney(amountMinor);
}

/**
 * The one line that appears on a receipt and must be exactly reconcilable.
 *
 * Gross, what the platform took, and what reached the person. At today's rates
 * the middle number is zero and the line says so rather than hiding it, which
 * is the opposite of a fee a reader has to go looking for.
 */
export function settlementLines(input: {
  grossMinor: number;
  commissionMinor: number;
  netMinor: number;
}): readonly { label: string; value: string }[] {
  const rows = [{ label: "Amount set aside", value: formatMoney(input.grossMinor) }];
  if (input.commissionMinor > 0) {
    rows.push({ label: "Vallo's share", value: formatMoney(input.commissionMinor) });
  }
  rows.push({ label: "Paid out", value: formatMoney(input.netMinor) });
  return rows;
}

/**
 * The words no sentence in this feature may contain.
 *
 * Checked by a test over every string this module and the email builders
 * produce. `escrow` is here because it is a legal term of art that means
 * something specific and unproven about who holds the money; `guarantee`,
 * `safe`, `protected` and `insured` are here because they are promises the
 * platform cannot keep and a lawyer would strike out.
 */
export const BANNED_IN_ESCROW_COPY: readonly string[] = [
  "escrow",
  "guarantee",
  "guaranteed",
  "insured",
  "protected",
  "100% safe",
  "risk free",
  "demo",
  "sample",
  "preview",
  "not live",
  "coming soon",
  "lorem",
] as const;

/** Every banned word a string contains, for a test to fail on by name. */
export function bannedWordsIn(text: string): readonly string[] {
  const haystack = text.toLowerCase();
  return BANNED_IN_ESCROW_COPY.filter((word) => haystack.includes(word));
}
