/**
 * The held-payment emails. One per state change, and the refund that was never
 * written.
 *
 * F-8 in `docs/research/ESCROW_END_TO_END_RESEARCH.md` 5.1. Two builders
 * existed, `escrowFunded` and `escrowReleased`, both in `lib/email/messages.ts`
 * and neither wired to a send site. They say "held in escrow", which is the
 * one thing nobody may say until the founder's solicitor has answered in
 * writing which structure the company holds funds under. There was no refund
 * builder at all, so the one email a person most needs, the one that says
 * their money came back, did not exist.
 *
 * THIS IS A NEW FILE AND NOT AN EDIT TO messages.ts, deliberately: another
 * session owns part of that file today. The two old builders there are left
 * alone rather than deleted, because deleting somebody else's live exports
 * mid-session is how a build loses an afternoon. They remain unwired; these
 * are what the escrow surface sends.
 *
 * EVERY SENTENCE COMES THROUGH `lib/escrow/copy.ts`. The structure rule, the
 * date rule and the banned word list are enforced there, in code, and tested
 * over every string this file produces. No email here names who holds the
 * money, because `custodySentence` returns null and there is nothing to print.
 */

import {
  SET_ASIDE_SENTENCE,
  STATE_LABEL,
  countdown,
  custodySentence,
  settlementLines,
  type EscrowPurpose,
  type EscrowState,
} from "../escrow/copy";
import {
  appUrl,
  button,
  compose,
  heading,
  hello,
  money,
  note,
  paragraph,
  rows,
  type Block,
  type ReceiptRow,
} from "./render";

/** The same shape every other message in this estate returns. */
export type EscrowEmail = {
  subject: string;
  html: string;
  text: string;
};

/** What every held-payment email needs to know. */
export type EscrowEmailBase = {
  /** The reader's first name, or nothing. Never interpolated bare. */
  name?: string | null;
  /** The agreement's id, which is also its link and its receipt number. */
  id: string;
  /** Integer kobo. */
  amountMinor: number;
  /** What the payment is for. */
  purpose: EscrowPurpose;
  /** The other person, by name, because "the other party" is nobody. */
  counterpartyName?: string | null;
  /** The property, when there is one. */
  listingTitle?: string | null;
};

function link(id: string): string {
  return appUrl(`/escrow/${id}`);
}

function who(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : "the other person";
}

/** The receipt rows every one of these carries, so the figures never differ. */
function summaryRows(base: EscrowEmailBase): ReceiptRow[] {
  const out: ReceiptRow[] = [
    { label: "Reference", value: base.id },
    { label: "Amount", value: money(base.amountMinor) },
  ];
  if (base.listingTitle && base.listingTitle.trim().length > 0) {
    out.push({ label: "Property", value: base.listingTitle.trim() });
  }
  return out;
}

/**
 * The custody line, or nothing.
 *
 * `custodySentence()` is null while the structure is undecided, so this
 * returns an empty list and the email simply has one fewer paragraph. There is
 * no fallback sentence, which is the point.
 */
function custodyBlocks(): Block[] {
  const sentence = custodySentence();
  return sentence ? [paragraph(sentence)] : [];
}

/**
 * The subject, the inbox line and the blocks.
 *
 * `preheader` is what a reader sees beside the subject in the list, and
 * `compose` requires it rather than defaulting, precisely so that nobody ships
 * an email whose preview is the first six words of the greeting. Every one
 * here says the thing the subject could not fit.
 */
function build(subject: string, preheader: string, blocks: readonly Block[]): EscrowEmail {
  const composed = compose({ preheader, blocks: [...blocks] });
  return { subject, html: composed.html, text: composed.text };
}

/* ------------------------------------------------------------------------ */
/* INITIATED. Somebody has proposed it.                                      */
/* ------------------------------------------------------------------------ */

export function heldPaymentProposed(
  data: EscrowEmailBase & { viewer: "payer" | "payee"; note?: string | null },
): EscrowEmail {
  const payer = data.viewer === "payer";
  const subject = payer
    ? `${who(data.counterpartyName)} asked you to set ${money(data.amountMinor)} aside`
    : `You asked ${who(data.counterpartyName)} to set ${money(data.amountMinor)} aside`;

  const blocks: Block[] = [
    heading(payer ? "A payment is waiting on you" : "Your request has gone out"),
    paragraph(hello(data.name)),
    paragraph(
      payer
        ? `${who(data.counterpartyName)} has asked you to set ${money(data.amountMinor)} aside for the ${labelFor(data.purpose)}. Nothing has left your balance.`
        : `You have asked ${who(data.counterpartyName)} to set ${money(data.amountMinor)} aside for the ${labelFor(data.purpose)}. Nothing has moved yet.`,
    ),
    rows(summaryRows(data)),
  ];
  if (data.note && data.note.trim().length > 0) {
    blocks.push(note(data.note.trim()));
  }
  blocks.push(
    paragraph(SET_ASIDE_SENTENCE),
    ...custodyBlocks(),
    button(payer ? "Read it and decide" : "See where it stands", link(data.id), true),
  );
  return build(
    subject,
    payer ? "Nothing has left your balance yet." : "Nothing has moved yet.",
    blocks,
  );
}

/* ------------------------------------------------------------------------ */
/* HELD. The money is out of the payer's spendable balance.                  */
/* ------------------------------------------------------------------------ */

export function heldPaymentSetAside(
  data: EscrowEmailBase & { viewer: "payer" | "payee"; autoReleaseAt: string | Date | null },
): EscrowEmail {
  const payer = data.viewer === "payer";
  const due = countdown(data.autoReleaseAt, "HELD");
  const subject = payer
    ? `${money(data.amountMinor)} is set aside`
    : `${money(data.amountMinor)} is set aside for you`;

  const blocks: Block[] = [
    heading(STATE_LABEL.HELD),
    paragraph(hello(data.name)),
    paragraph(
      payer
        ? `${money(data.amountMinor)} has left your spendable balance and is set aside for the ${labelFor(data.purpose)}.`
        : `${who(data.counterpartyName)} has set ${money(data.amountMinor)} aside for the ${labelFor(data.purpose)}. It reaches your Vallo balance when this is settled.`,
    ),
    rows(summaryRows(data)),
    paragraph(SET_ASIDE_SENTENCE),
    ...custodyBlocks(),
  ];
  if (due.kind === "due") {
    blocks.push(
      paragraph(
        payer
          ? `${due.line} Before then you can confirm it early, or say what is wrong.`
          : due.line,
      ),
    );
  }
  blocks.push(button("Open it", link(data.id), true));
  return build(
    subject,
    due.kind === "due"
      ? "Neither of you can spend it until it is paid out or returned."
      : "Neither of you can spend it until this is settled.",
    blocks,
  );
}

/* ------------------------------------------------------------------------ */
/* RELEASE_REQUESTED. One side has asked to be paid.                         */
/* ------------------------------------------------------------------------ */

export function heldPaymentPayoutAsked(
  data: EscrowEmailBase & { viewer: "payer" | "payee"; autoReleaseAt: string | Date | null },
): EscrowEmail {
  const payer = data.viewer === "payer";
  const due = countdown(data.autoReleaseAt, "RELEASE_REQUESTED");
  const subject = payer
    ? `${who(data.counterpartyName)} has asked to be paid`
    : "Your payout request has gone out";

  const blocks: Block[] = [
    heading(STATE_LABEL.RELEASE_REQUESTED),
    paragraph(hello(data.name)),
    paragraph(
      payer
        ? `${who(data.counterpartyName)} says the ${labelFor(data.purpose)} is done and has asked for the ${money(data.amountMinor)} to be paid out.`
        : `You have asked for the ${money(data.amountMinor)} to be paid out. ${who(data.counterpartyName)} can confirm it, or say what is wrong.`,
    ),
    rows(summaryRows(data)),
  ];
  if (due.kind === "due") {
    blocks.push(paragraph(due.line));
  }
  if (payer) {
    blocks.push(
      paragraph(
        "If that matches what happened, confirm it and the money goes across straight away. If it does not, say what is wrong and somebody at Vallo will read it.",
      ),
    );
  }
  blocks.push(button(payer ? "Confirm or object" : "See where it stands", link(data.id), true));
  return build(
    subject,
    payer ? "Confirm it, or say what is wrong." : "It is with the other side now.",
    blocks,
  );
}

/* ------------------------------------------------------------------------ */
/* RELEASED. The money went across.                                          */
/* ------------------------------------------------------------------------ */

export function heldPaymentPaidOut(
  data: EscrowEmailBase & {
    viewer: "payer" | "payee";
    commissionMinor: number;
    netMinor: number;
    /** Set when nobody objected and the date arrived. */
    automatic?: boolean;
  },
): EscrowEmail {
  const payer = data.viewer === "payer";
  const subject = payer
    ? `${money(data.amountMinor)} has been paid out`
    : `${money(data.netMinor)} has reached your balance`;

  const blocks: Block[] = [
    heading(STATE_LABEL.RELEASED),
    paragraph(hello(data.name)),
    paragraph(
      payer
        ? data.automatic
          ? `The date passed with nothing raised, so the ${money(data.amountMinor)} for the ${labelFor(data.purpose)} has gone to ${who(data.counterpartyName)}.`
          : `The ${money(data.amountMinor)} for the ${labelFor(data.purpose)} has gone to ${who(data.counterpartyName)}.`
        : `${money(data.netMinor)} is in your Vallo balance. You can spend it or withdraw it to your bank.`,
    ),
    rows([
      { label: "Reference", value: data.id },
      ...settlementLines({
        grossMinor: data.amountMinor,
        commissionMinor: data.commissionMinor,
        netMinor: data.netMinor,
      }).map((r) => ({ label: r.label, value: r.value })),
    ]),
    paragraph("This email is your receipt. The full record is on the page below."),
    button("See the record", link(data.id), true),
  ];
  return build(subject, "This email is your receipt.", blocks);
}

/* ------------------------------------------------------------------------ */
/* REFUNDED. The builder that did not exist.                                 */
/* ------------------------------------------------------------------------ */

export function heldPaymentReturned(
  data: EscrowEmailBase & { viewer: "payer" | "payee"; reason?: string | null },
): EscrowEmail {
  const payer = data.viewer === "payer";
  const subject = payer
    ? `${money(data.amountMinor)} has been returned to you`
    : `${money(data.amountMinor)} has gone back to ${who(data.counterpartyName)}`;

  const blocks: Block[] = [
    heading(STATE_LABEL.REFUNDED),
    paragraph(hello(data.name)),
    paragraph(
      payer
        ? `The ${money(data.amountMinor)} you set aside for the ${labelFor(data.purpose)} is back in your Vallo balance. You can spend it or withdraw it to your bank.`
        : `The ${money(data.amountMinor)} set aside for the ${labelFor(data.purpose)} has gone back to ${who(data.counterpartyName)}.`,
    ),
    rows(summaryRows(data)),
  ];
  if (data.reason && data.reason.trim().length > 0) {
    blocks.push(note(data.reason.trim()));
  }
  blocks.push(
    paragraph("This email is your receipt. The full record is on the page below."),
    button("See the record", link(data.id), true),
  );
  return build(subject, "This email is your receipt.", blocks);
}

/* ------------------------------------------------------------------------ */
/* DISPUTED. Somebody said something is wrong.                               */
/* ------------------------------------------------------------------------ */

export function heldPaymentDisputed(
  data: EscrowEmailBase & { viewer: "payer" | "payee"; raisedByYou: boolean; reason: string },
): EscrowEmail {
  const subject = data.raisedByYou
    ? "We have your objection"
    : `${who(data.counterpartyName)} has objected`;

  const blocks: Block[] = [
    heading(STATE_LABEL.DISPUTED),
    paragraph(hello(data.name)),
    paragraph(
      data.raisedByYou
        ? `We have what you said about the ${money(data.amountMinor)} set aside for the ${labelFor(data.purpose)}. Nothing moves while somebody at Vallo reads it.`
        : `${who(data.counterpartyName)} has said something is wrong with the ${labelFor(data.purpose)}. Nothing moves while somebody at Vallo reads it.`,
    ),
    note(data.reason.trim()),
    rows(summaryRows(data)),
    paragraph(
      "Add anything that shows what happened: a receipt, a photograph, a screenshot of your messages, or the dates things happened on. Both of you can see everything that is filed.",
    ),
    button("Add what you have", link(data.id), true),
  ];
  return build(subject, "Nothing moves while somebody at Vallo reads it.", blocks);
}

/* ------------------------------------------------------------------------ */
/* RESOLVED. Vallo decided.                                                  */
/* ------------------------------------------------------------------------ */

export function heldPaymentRuling(
  data: EscrowEmailBase & {
    viewer: "payer" | "payee";
    /** Where the money went. */
    direction: "release" | "refund";
    /** The operator's words, verbatim, to both sides. */
    ruling: string;
    netMinor: number;
    commissionMinor: number;
  },
): EscrowEmail {
  const toPayee = data.direction === "release";
  const subject = "A decision on your held payment";

  const blocks: Block[] = [
    heading(STATE_LABEL.RESOLVED),
    paragraph(hello(data.name)),
    paragraph(
      toPayee
        ? `Vallo has read what both of you filed and the ${money(data.amountMinor)} has gone to ${data.viewer === "payee" ? "you" : who(data.counterpartyName)}.`
        : `Vallo has read what both of you filed and the ${money(data.amountMinor)} has gone back to ${data.viewer === "payer" ? "you" : who(data.counterpartyName)}.`,
    ),
    /* THE RULING REACHES BOTH SIDES WORD FOR WORD. An operator's reasons
       summarised for one party and quoted to the other is how a decision
       becomes an argument. */
    note(data.ruling.trim()),
    rows([
      { label: "Reference", value: data.id },
      ...settlementLines({
        grossMinor: data.amountMinor,
        commissionMinor: data.commissionMinor,
        netMinor: data.netMinor,
      }).map((r) => ({ label: r.label, value: r.value })),
    ]),
    button("See the record", link(data.id), true),
  ];
  return build(subject, "The reasons are in full, to both of you.", blocks);
}

/* ------------------------------------------------------------------------ */
/* CANCELLED. It ended before it started.                                    */
/* ------------------------------------------------------------------------ */

export function heldPaymentWithdrawn(
  data: EscrowEmailBase & { viewer: "payer" | "payee"; withdrawnByYou: boolean; note: string },
): EscrowEmail {
  const subject = data.withdrawnByYou
    ? "You withdrew a request"
    : `${who(data.counterpartyName)} withdrew a request`;

  return build(subject, "Nothing left either balance.", [
    heading(STATE_LABEL.CANCELLED),
    paragraph(hello(data.name)),
    paragraph(
      `The request to set ${money(data.amountMinor)} aside for the ${labelFor(data.purpose)} has been withdrawn. Nothing left either balance.`,
    ),
    note(data.note.trim()),
    rows(summaryRows(data)),
    button("See the record", link(data.id), true),
  ]);
}

/* ------------------------------------------------------------------------ */

/** The purpose in the reader's words, lower case inside a sentence. */
function labelFor(purpose: EscrowPurpose): string {
  switch (purpose) {
    case "agency_fee":
      return "agency fee";
    case "purchase_deposit":
      return "deposit on the purchase";
    case "purchase_balance":
      return "balance on the purchase";
    case "rent_deposit":
      return "caution deposit";
    case "first_rent":
      return "first rent";
  }
}

/** Every builder in this file, for a test to walk without naming each one. */
export const ESCROW_EMAIL_STATES: readonly EscrowState[] = [
  "INITIATED",
  "HELD",
  "RELEASE_REQUESTED",
  "RELEASED",
  "REFUNDED",
  "DISPUTED",
  "RESOLVED",
  "CANCELLED",
] as const;
