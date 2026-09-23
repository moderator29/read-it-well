import {
  appUrl,
  button,
  compose,
  heading,
  hello,
  note,
  paragraph,
  rows,
  type Block,
  type ReceiptRow,
} from "./render";

/**
 * THE SIX EMAILS THAT WERE NOT WRITTEN, AND THE COMMENT THAT ASKED FOR THEM.
 *
 * `lib/payments/notices.ts` tells somebody in the application when a card or a
 * bank account is added, promoted or removed. All six pass `email: null`, and
 * the file says plainly why:
 *
 *   "`lib/email/messages.ts` has a builder for a password change and for a new
 *    device sign-in, which are the two events of this exact class that already
 *    exist, and it has none for a payment instrument. Writing one belongs to
 *    whoever owns `lib/email`."
 *
 * This is that file. It is deliberately the same class as those two: a notice
 * about a change to how an account works, sent because the person who did not
 * make the change is the one who needs to hear about it, on a channel that
 * reaches them when they are not holding the phone.
 *
 * ---------------------------------------------------------------------------
 * WHY AN IN-APP ROW WAS NEVER ENOUGH FOR THIS PARTICULAR SIX.
 *
 * The threat model is written into `lib/payments/notices.ts` already:
 * "somebody whose session was stolen could have their payout account swapped
 * for the attacker's and the first they would know of it is a withdrawal that
 * did not arrive." An attacker holding the session ALSO holds the notification
 * bell. They can open it, read the row and mark it read, and the owner will
 * never see it. The email is the only one of the two channels the person
 * holding the session does not also control.
 *
 * ---------------------------------------------------------------------------
 * ONE BUILDER, SIX EVENTS, AND THAT IS NOT LAZINESS.
 *
 * Six functions would drift, and the one that would drift first is the one
 * that matters most. The reader's question is identical in all six cases and
 * it is four words long, "did I do that", and the answer differs only in one
 * sentence and one row. Keeping them together guarantees that the payout
 * account email is exactly as clear as the saved card one, which is the way
 * round that normally goes wrong. It is the same argument `withdrawalOutcome`
 * makes for its three endings and it is right for the same reason.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAY BE PRINTED, WHICH IS RULE 16 AND NOT A STYLE CHOICE.
 *
 * The brand word for a card and its last four digits, because the networks
 * themselves treat those as non-sensitive and they are the only handle a
 * person has for telling two of their own cards apart. The bank's name, which
 * is a public fact about an institution. NO ACCOUNT NUMBER AND NOT ONE DIGIT
 * OF ONE: ten digits minus four is still a NUBAN somebody can narrow, and a
 * bank name plus "ending in" would identify the account to the one person who
 * does not need it identified. No card number, no BVN, no bank verification
 * name. The vocabulary here is the same vocabulary `lib/payments/notices.ts`
 * uses for the in-app row, on purpose, so that the two halves of one
 * announcement never say different things about the same event.
 */

/** What every message function in this estate returns. */
export type PaymentInstrumentEmail = {
  subject: string;
  html: string;
  text: string;
};

/** The six things that can happen on the payments desk. */
export type PaymentInstrumentEvent =
  | "card_saved"
  | "card_default_changed"
  | "card_removed"
  | "bank_added"
  | "bank_default_changed"
  | "bank_removed";

export type PaymentInstrumentData = {
  event: PaymentInstrumentEvent;
  name?: string | null;
  /** "Visa", "Mastercard", "Verve", or anything else, which becomes "card". */
  cardType?: string | null;
  /** Exactly four digits, or nothing. Never more. */
  last4?: string | null;
  /** The institution, for the three bank events. */
  bankName?: string | null;
};

/** Where every one of these lands, and it is the page that can undo it. */
const PAYMENTS_PATH = "/settings/payments";

/**
 * A card brand as an email may print it.
 *
 * The same dull mapping `lib/payments/notices.ts` keeps for the notification
 * row, restated here rather than imported, because that module is a server
 * module that pulls in the Supabase client and the junction, and an email
 * builder has to stay pure enough for a fixture to render it with no
 * environment at all. Two copies of eight lines is the right price for that;
 * `payment-instrument-messages.test.ts` holds them equal.
 */
function brandWord(cardType: string | null | undefined): string {
  const raw = (cardType ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (raw === "visa") return "Visa";
  if (raw === "mastercard" || raw === "master") return "Mastercard";
  if (raw === "verve") return "Verve";
  return "card";
}

/** "your Visa card ending 4081", or "your card" when the brand is unknown. */
export function cardPhrase(
  cardType: string | null | undefined,
  last4: string | null | undefined,
): string {
  const brand = brandWord(cardType);
  const digits = (last4 ?? "").trim();
  const noun = brand === "card" ? "card" : `${brand} card`;
  return /^\d{4}$/.test(digits) ? `your ${noun} ending ${digits}` : `your ${noun}`;
}

/** "your account at GTBank", or "your bank account" when we were not told. */
function bankPhrase(bankName: string | null | undefined): string {
  const name = (bankName ?? "").trim();
  return name.length > 0 ? `your account at ${name}` : "your bank account";
}

/** True for the three that concern a card rather than a bank account. */
function isCard(event: PaymentInstrumentEvent): boolean {
  return event.startsWith("card_");
}

/** The thing the change was made to, in the reader's words. */
function instrument(data: PaymentInstrumentData): string {
  return isCard(data.event) ? cardPhrase(data.cardType, data.last4) : bankPhrase(data.bankName);
}

/** The one row that differs between the six, and the label above it. */
function instrumentRows(data: PaymentInstrumentData): ReceiptRow[] {
  const list: ReceiptRow[] = [{ label: "Change", value: CHANGE_LABEL[data.event], strong: true }];
  if (isCard(data.event)) {
    const digits = (data.last4 ?? "").trim();
    list.push({
      label: "Card",
      value: /^\d{4}$/.test(digits)
        ? `${brandWord(data.cardType)} ending ${digits}`
        : brandWord(data.cardType),
    });
  } else {
    const name = (data.bankName ?? "").trim();
    /* The bank, and nothing beside it. See the head on why a NUBAN gets no
       digits at all, not even four. */
    if (name.length > 0) list.push({ label: "Bank", value: name });
  }
  return list;
}

const CHANGE_LABEL: Record<PaymentInstrumentEvent, string> = {
  card_saved: "A card was saved",
  card_default_changed: "The default card changed",
  card_removed: "A card was removed",
  bank_added: "A bank account was added",
  bank_default_changed: "The payout account changed",
  bank_removed: "A bank account was removed",
};

const SUBJECT: Record<PaymentInstrumentEvent, string> = {
  card_saved: "A card was saved to your Vallo account",
  card_default_changed: "Your default card on Vallo changed",
  card_removed: "A card was removed from your Vallo account",
  bank_added: "A bank account was added to your Vallo account",
  /* The one to shout about: this is the change that redirects money. */
  bank_default_changed: "Your Vallo payout account changed",
  bank_removed: "A bank account was removed from your Vallo account",
};

/**
 * What happened, said once, in the sentence the reader needs.
 *
 * Each of these states the effect rather than the operation. "Money you
 * withdraw now goes to" is what a payout account change MEANS; "your default
 * payout destination was updated" is what a database did.
 */
function whatHappened(data: PaymentInstrumentData): string {
  const thing = instrument(data);
  switch (data.event) {
    case "card_saved":
      return `We saved ${thing} to your Vallo account. Nothing was charged to it beyond the small check the bank requires, which is returned.`;
    case "card_default_changed":
      return `Payments on Vallo now use ${thing} first.`;
    case "card_removed":
      return `We removed ${thing} from your Vallo account. Nothing was charged.`;
    case "bank_added":
      return `We added ${thing} for your payouts, after the bank confirmed the name on it.`;
    case "bank_default_changed":
      return `Money you withdraw from Vallo now goes to ${thing}.`;
    case "bank_removed":
      return `We removed ${thing} from your Vallo account. Your balance is untouched.`;
  }
}

/** What to do if it was not you, in the order that undoes the damage. */
function ifNotYou(event: PaymentInstrumentEvent): string {
  switch (event) {
    case "bank_default_changed":
      /* Money leaves to this account. The password comes first because an
         attacker who still holds the session simply changes it back. */
      return "If it was not you, change your password first, then set your payout account back. Until the password changes, whoever made this change can make it again.";
    case "bank_added":
      return "If it was not you, change your password first, then remove the account on the payments page.";
    case "card_saved":
    case "card_default_changed":
      return "If it was not you, change your password first, then remove the card on the payments page.";
    case "card_removed":
    case "bank_removed":
      return "If it was not you, change your password now. Nothing can be taken by removing an instrument, but somebody who can remove one can add one.";
  }
}

function build(subject: string, preheader: string, blocks: readonly Block[]): PaymentInstrumentEmail {
  const composed = compose({
    preheader,
    blocks: [...blocks],
    footerLines: [
      "You are receiving this because of a change to how your Vallo account pays or gets paid.",
      "This is a security notice. It is always sent and it cannot be switched off.",
    ],
  });
  return { subject, html: composed.html, text: composed.text };
}

/**
 * Tell somebody that the way their account pays, or gets paid, has changed.
 *
 * Deliberately not alarming in its own right. Most of these are the owner
 * adding a card, and an email that shouts at somebody for saving a card is an
 * email they learn to delete unread, which is exactly the habit that makes the
 * seventh one invisible. It states the fact, names the instrument in the words
 * the person would use for it, and puts the two actions in the order that
 * works.
 */
export function paymentInstrumentChanged(data: PaymentInstrumentData): PaymentInstrumentEmail {
  const blocks: Block[] = [
    heading(CHANGE_LABEL[data.event]),
    paragraph(`${hello(data.name)} ${whatHappened(data)}`),
    rows(instrumentRows(data)),
    paragraph("If that was you, there is nothing to do and you can ignore this message."),
    paragraph(ifNotYou(data.event)),
    button("Open your payments page", appUrl(PAYMENTS_PATH), true),
    note(
      "Vallo will never ask you for your card number, your PIN, your bank password or a one-time code, by phone, by message or by email. If somebody does, it is not us.",
    ),
  ];
  return build(SUBJECT[data.event], whatHappened(data), blocks);
}

/** Exported for the test that holds this vocabulary equal to the notice's. */
export const __testing = { brandWord, bankPhrase, CHANGE_LABEL, SUBJECT };
