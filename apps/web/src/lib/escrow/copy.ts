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

import { BANNED_IN_EXAMPLE_COPY } from "../copy/banned-phrases";

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
  RESOLVED: "Settled after review",
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
      return "The dispute was reviewed and settled, and the money has moved as the ruling on this page says.";
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
 * THE HOUSE LIST IS IMPORTED, NOT RETYPED. `lib/copy/banned-phrases.ts` holds
 * the platform's own ban on unreal words and schedule promises, and a source
 * scan in `banned-phrases.test.ts` fails any file that contains one of them as
 * a literal. Writing them out again here would break that scan, and it did:
 * the first version of this file listed them as plain strings and the house
 * test refused the build. Composing the list is both correct and the only way
 * to state it once.
 *
 * WHAT ESCROW ADDS ON TOP, as patterns rather than substrings so a word inside
 * another word does not trip them:
 *
 *   The legal term of art itself, because it means something specific and
 *   unproven about who holds the money, and because it is not a word anybody
 *   uses about their own naira.
 *
 *   Every promise the platform cannot keep. Guaranteed, insured, protected,
 *   risk free, completely safe. A lawyer would strike each one out, and each
 *   one is the sentence a person quotes back when it goes wrong.
 */
export const ESCROW_ONLY_BANNED: readonly { label: string; pattern: RegExp }[] = [
  { label: "escrow", pattern: /\bescrows?\b/i },
  { label: "guarantee", pattern: /\bguarantee[ds]?\b/i },
  { label: "insured", pattern: /\binsur(ed|ance)\b/i },
  { label: "protected", pattern: /\bprotect(ed|ion)\b/i },
  { label: "risk free", pattern: /\brisk[- ]free\b/i },
  { label: "completely safe", pattern: /\b(completely|totally|100%)\s+safe\b/i },
] as const;

/** The house ban and escrow's own, in one vocabulary. */
export const BANNED_IN_ESCROW_COPY: readonly { label: string; pattern: RegExp }[] = [
  ...BANNED_IN_EXAMPLE_COPY,
  ...ESCROW_ONLY_BANNED,
];

/** Every banned word a string contains, for a test to fail on by name. */
export function bannedWordsIn(text: string): readonly string[] {
  return BANNED_IN_ESCROW_COPY.filter(({ pattern }) => pattern.test(text)).map((r) => r.label);
}

/**
 * THE THIRTEEN FACTS, STATED ONCE.
 *
 * WHY THEY LIVE HERE AND NOT BESIDE THE COMPONENT THAT RENDERS THEM. The list
 * existed in three places on 22 September: an enum in the database, a `FACTS`
 * array in `actions.ts` that the schema validates against, and a `FACT_LINE`
 * map inside `EvidenceList.tsx` that turns one into a sentence. Three copies
 * of a closed list is two copies too many, and the failure mode is silent: a
 * fourteenth value added to the enum renders as "A fact" and nobody notices
 * because nothing throws.
 *
 * EVIDENCE IS FILES AND FACTS, NEVER OPINIONS. Each of these either happened
 * or did not. There is no "I think", no "they seemed", and no free text beside
 * them: a fact that needs a day carries a date, a fact that needs a figure
 * carries integer kobo, and nothing carries a sentence. The only free text a
 * person may attach to evidence at all is a file's caption, capped at two
 * hundred characters, and the label asks what the file SHOWS.
 *
 * THE SHAPE RULES ARE THE DATABASE'S, RESTATED. `escrow_evidence_fact_carries_
 * what_it_needs` is a check constraint that says a dated fact has a date and no
 * amount, that `amount_agreed` has an amount and no date, and that everything
 * else has neither. `needs` below is the same sentence in the language the form
 * is written in, so the person is refused by a field label before they are
 * refused by a status code.
 */
export type EscrowFact =
  | "viewing_attended"
  | "viewing_missed"
  | "keys_received"
  | "keys_not_received"
  | "agreement_signed"
  | "agreement_not_signed"
  | "service_delivered"
  | "service_not_delivered"
  | "property_matched_listing"
  | "property_differed_from_listing"
  | "contacted_on"
  | "no_reply_since"
  | "amount_agreed";

/** What a fact needs beside it before the database will take it. */
export type FactNeeds = "date" | "amount" | "nothing";

export const ESCROW_FACTS: readonly {
  value: EscrowFact;
  /** The sentence in the reader's words rather than in the enum's. */
  line: string;
  needs: FactNeeds;
}[] = [
  { value: "viewing_attended", line: "The inspection happened", needs: "date" },
  { value: "viewing_missed", line: "The inspection did not happen", needs: "date" },
  { value: "keys_received", line: "The keys were handed over", needs: "nothing" },
  { value: "keys_not_received", line: "The keys were not handed over", needs: "nothing" },
  { value: "agreement_signed", line: "An agreement was signed", needs: "nothing" },
  { value: "agreement_not_signed", line: "No agreement was signed", needs: "nothing" },
  { value: "service_delivered", line: "The work was done", needs: "nothing" },
  { value: "service_not_delivered", line: "The work was not done", needs: "nothing" },
  { value: "property_matched_listing", line: "The property matched the listing", needs: "nothing" },
  {
    value: "property_differed_from_listing",
    line: "The property was not what the listing said",
    needs: "nothing",
  },
  { value: "contacted_on", line: "Got in touch", needs: "date" },
  { value: "no_reply_since", line: "No reply since", needs: "date" },
  { value: "amount_agreed", line: "The amount agreed", needs: "amount" },
] as const;

/** Every fact value, for a schema to close itself against. */
export const ESCROW_FACT_VALUES = ESCROW_FACTS.map((f) => f.value) as readonly EscrowFact[];

/** What a given fact needs beside it, or `nothing`. */
export function factNeeds(fact: string): FactNeeds {
  return ESCROW_FACTS.find((f) => f.value === fact)?.needs ?? "nothing";
}

/**
 * One filed fact, as a sentence with its date or its amount folded in.
 *
 * An unknown value reads as "A fact" rather than throwing, because a row that
 * is already in the database must render on a dispute even if this deployment
 * has not heard of its value yet. The test that keeps the list honest is that
 * every enum value in the database has an entry here, not that this function
 * refuses the ones that do not.
 */
export function factSentence(input: {
  fact: string | null;
  happenedOn?: string | null;
  amountMinor?: number | null;
}): string {
  const line = ESCROW_FACTS.find((f) => f.value === input.fact)?.line ?? "A fact";
  if (input.happenedOn) {
    return `${line} on ${formatDate(new Date(`${input.happenedOn}T12:00:00Z`))}`;
  }
  if (typeof input.amountMinor === "number") return `${line}: ${formatMoney(input.amountMinor)}`;
  return line;
}

/**
 * WHAT MAY BE ATTACHED, and it is the bucket's own list rather than a guess.
 *
 * `escrow-evidence` was created with exactly these five types and a ten
 * megabyte ceiling. A picker that offers a sixth type produces an upload that
 * storage refuses with an error the person cannot act on, so the accept list
 * and the cap are read from here by both the picker and the server action and
 * match the bucket exactly. HEIF is deliberately absent: the bucket does not
 * carry it, and an iPhone offering a HEIF file that storage will refuse is
 * worse than an iPhone converting it first.
 */
export const EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export type EvidenceMimeType = (typeof EVIDENCE_MIME_TYPES)[number];

/** Ten megabytes, which is what the bucket accepts. */
export const EVIDENCE_MAX_BYTES = 10_485_760;

/** The private bucket the files land in. Named once, read by both sides. */
export const EVIDENCE_BUCKET = "escrow-evidence";

/** The caption cap, which is where an opinion would otherwise go. */
export const EVIDENCE_CAPTION_MAX = 200;

/** True when this is a type the bucket will actually take. */
export function isEvidenceMimeType(value: string): value is EvidenceMimeType {
  return (EVIDENCE_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * Where a file goes in the bucket: `<agreement>/<the person filing>/<uuid>`.
 *
 * THE PATH IS THE PERMISSION. The storage policy checks both segments, so a
 * path built any other way is refused by the database rather than accepted
 * into the wrong folder. It is derived in one function for the same reason a
 * payment reference is: two places that build a key eventually build two
 * different keys.
 */
export function evidenceObjectPath(input: {
  escrowId: string;
  authorId: string;
  fileName: string;
  unique: string;
}): string {
  const dot = input.fileName.lastIndexOf(".");
  const ext =
    dot > 0 && dot < input.fileName.length - 1
      ? input.fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "")
      : "";
  return `${input.escrowId}/${input.authorId}/${input.unique}${ext ? `.${ext}` : ""}`;
}

/**
 * THE PROPOSAL, AND WHAT IT IS CAREFUL NOT TO SAY.
 *
 * Build rule 15, no dark patterns, decides most of this. There is no default
 * amount, no pre-ticked anything, no countdown on a proposal that nobody has
 * accepted, and no sentence implying the other person has agreed to something
 * they have not. The word "proposed" is used throughout and never "requested",
 * because a request carries an obligation and a proposal does not.
 */
export const PROPOSAL_OPENER = "Propose setting an amount aside";

export const PROPOSAL_EXPLAINER =
  "Nothing is paid now. The other person sees what you have proposed and decides. If they agree, the money leaves their spendable balance and is set aside until you both say it is settled.";

/** The line under a proposal that has been made and not yet accepted. */
export function proposalStanding(viewer: Party): string {
  return viewer === "payer"
    ? "You have been asked to set this money aside. Nothing has left your balance and you can decline."
    : "You have proposed this. Nothing has moved, and the other person can decline it.";
}

/**
 * The date the money would pay out if it were set aside now.
 *
 * RULE 2 LIVES IN THIS FILE AND NOWHERE ELSE, so the funding step cannot say
 * "in 21 days" by writing its own string. The hold window is a number of days
 * in the database and it stops being one the moment it reaches a person: what
 * they read is a date in a diary. There is deliberately no exported helper
 * that returns the number.
 */
export function payoutDateIfFundedNow(holdDays = 21, now: Date = new Date()): string {
  const on = new Date(now.getTime());
  on.setDate(on.getDate() + Math.min(180, Math.max(1, Math.trunc(holdDays))));
  return `If neither of you says otherwise, it pays out on ${formatDate(on)}.`;
}

/**
 * Naira as a person types them, integer kobo as the ledger stores them.
 *
 * NO FLOAT TOUCHES AN AMOUNT AT ANY POINT. `Number("1234.56") * 100` is
 * 123455.99999999999, and the platform's rule is that money is integer kobo as
 * bigint and never a float. So the naira and the kobo are parsed as two
 * separate runs of digits and combined with integer arithmetic.
 *
 * IT REFUSES RATHER THAN GUESSES. Exponent notation, a minus sign, three
 * decimal places, a lone dot, an empty string and anything with a letter in it
 * all return null, and the caller says "give the amount in naira, as a number"
 * instead of moving a figure nobody typed. Spaces and thousands commas are the
 * only things forgiven, because they are how people actually write money.
 *
 * It lives in this file rather than beside a form because two forms already
 * needed it, and two places that parse money eventually parse it differently.
 */
export function nairaToKobo(naira: string): number | null {
  const cleaned = naira.replace(/[\s,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, part = ""] = cleaned.split(".");
  const padded = `${part}00`.slice(0, 2);
  const value = Number(whole) * 100 + Number(padded);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
