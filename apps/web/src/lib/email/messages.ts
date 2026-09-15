/**
 * The Vallo transactional email catalogue.
 *
 * One function per message, each taking typed data and returning a subject, an
 * HTML body and a plain text alternative. Nothing here reads the environment
 * beyond the site URL used for links, and nothing here sends: a message is a
 * pure value, so it can be inspected, diffed and tested without a network.
 *
 * Both renderings come from ONE description. A message is a list of blocks and
 * `compose` renders them twice, so the text alternative cannot drift out of
 * step with the HTML the way a hand-maintained second copy always does. See
 * render.ts.
 *
 * COPY RULES, ALL BINDING.
 *
 *   British spelling. Plain and calm: the tone of a platform that tells you
 *   what happened and what happens next, and then stops.
 *
 *   No marketing. Nobody opens a wallet receipt to be sold to. There is no
 *   "we are excited", no "amazing", no exclamation mark, and no claim this
 *   platform cannot stand behind.
 *
 *   No em dash characters, anywhere.
 *
 *   No emoji. Not as a section marker, not as a bullet, not in a subject line.
 *
 *   Money always through `money()`, so integer kobo can never reach a reader.
 *
 *   A name is always greeted through `hello()`, which cannot produce
 *   "Hello ,". Every function here takes the name as optional for that reason:
 *   the absence of a name is an ordinary state and not an error.
 *
 *   Safety guidance rides on the messages where somebody is about to move
 *   money or meet a stranger, and nowhere else. A warning on every email is a
 *   warning nobody reads.
 */

import {
  appUrl,
  bullets,
  button,
  code,
  compose,
  dateRange,
  greetingName,
  heading,
  hello,
  money,
  note,
  paragraph,
  prettyDate,
  rows,
  type Block,
  type ReceiptRow,
} from "./render";

/**
 * What every message function returns.
 *
 * `text` is not optional. A message without a plain text alternative is a
 * message that is worse at reaching an inbox and unreadable in a text-only
 * client, and making the field required is what stops one being added later
 * without one.
 */
export type EmailMessage = {
  subject: string;
  html: string;
  text: string;
};

/** The safety line for somebody about to pay or about to meet a lister. */
const MONEY_SAFETY_LINE =
  "Keep your chats and your payments inside Vallo, and pay only after you have inspected the property.";

/** The same guidance, stated to a lister about the people contacting them. */
const LISTER_SAFETY_LINE =
  "Vallo asks everybody to keep chats and payments inside Vallo and to pay only after inspecting.";

/** "2 adults and 1 child", or null when the party size is not known. */
function partyLine(adults?: number, children?: number): string | null {
  const grownUps = typeof adults === "number" && adults > 0 ? adults : 0;
  const little = typeof children === "number" && children > 0 ? children : 0;
  if (grownUps === 0 && little === 0) return null;
  const parts: string[] = [];
  if (grownUps > 0) parts.push(`${grownUps} ${grownUps === 1 ? "adult" : "adults"}`);
  if (little > 0) parts.push(`${little} ${little === 1 ? "child" : "children"}`);
  return parts.join(" and ");
}

function nightsLine(nights: number): string {
  return `${nights} ${nights === 1 ? "night" : "nights"}`;
}

/**
 * The person actually arriving, when that is not the person who paid.
 *
 * Present on a booking made for somebody else. The name and the number ride
 * on the booking row and are already visible to the payer, the host and an
 * admin, so putting them in these emails discloses nothing new to anybody who
 * receives one.
 */
export type ArrivingGuest = {
  name: string;
  /** Canonical +234 form, the way the booking stores it. */
  phone: string;
};

/** How a guest gets through the gate. Only ever sent to somebody arriving. */
export type ArrivalAccess = {
  estateName?: string | null;
  gateDirections?: string | null;
  securityPhone?: string | null;
  accessCode?: string | null;
};

/** The stay rows every booking email shares, in one order. */
function stayRows(data: {
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults?: number;
  children?: number;
  totalMinor?: number;
  arriving?: ArrivingGuest | null;
}): ReceiptRow[] {
  const list: ReceiptRow[] = [
    { label: "Stay", value: data.listingTitle },
    { label: "Dates", value: dateRange(data.checkIn, data.checkOut) },
    { label: "Length", value: nightsLine(data.nights) },
  ];
  const party = partyLine(data.adults, data.children);
  if (party) list.push({ label: "Guests", value: party });
  if (data.arriving) {
    list.push({ label: "Arriving", value: data.arriving.name });
    list.push({ label: "Their number", value: data.arriving.phone });
  }
  if (typeof data.totalMinor === "number") {
    list.push({ label: "Total for the stay", value: money(data.totalMinor), strong: true });
  }
  return list;
}

/**
 * The gate rows, or an empty list when the host has recorded nothing.
 *
 * An empty list renders no block at all rather than a heading over four blank
 * lines, because a panel with nothing in it reads as a bug and, worse, reads
 * as though the answer were "no gate". `compose` drops an empty rows block.
 */
function accessRows(access?: ArrivalAccess | null): ReceiptRow[] {
  if (!access) return [];
  const list: ReceiptRow[] = [];
  const push = (label: string, value: string | null | undefined, strong?: boolean) => {
    const trimmed = (value ?? "").trim();
    if (trimmed.length > 0) {
      list.push(strong ? { label, value: trimmed, strong } : { label, value: trimmed });
    }
  };
  push("Estate", access.estateName);
  push("Getting in", access.gateDirections);
  push("Security desk", access.securityPhone);
  push("Gate code", access.accessCode, true);
  return list;
}

/** Build a message from a subject, a preheader and blocks. */
function message(
  subject: string,
  preheader: string,
  blocks: readonly (Block | null | undefined | false)[],
  footerLines?: readonly string[],
): EmailMessage {
  const { html, text } = compose(
    footerLines ? { preheader, blocks, footerLines } : { preheader, blocks },
  );
  return { subject, html, text };
}

/* ------------------------------------------------------------------ account */

/**
 * What somebody said they came here to do.
 *
 * Mirrors `public.signup_role`. A DECLARATION and never a permission: choosing
 * "agent" here does not make anybody an agent, which still needs the
 * application, the ID and the approval. It decides which welcome this is.
 */
export type SignupRole = "renter" | "buyer" | "landlord" | "seller" | "agent";

export type WelcomeData = {
  name?: string | null;
  /** Null when they were never asked, or skipped. That is an ordinary state. */
  role?: SignupRole | null;
};

/**
 * The welcome, written five times over plus a general one.
 *
 * A single welcome that lists everything the platform does is a brochure, and
 * a brochure is what people archive without reading. Somebody who came here to
 * find a flat has one useful next step and it is not "list your property".
 *
 * Each version says the same three things in the reader's own terms: what to
 * do next, what protects them, and one true thing about how this market works
 * that they will be glad to know before they start. The last of those is the
 * part a generic welcome cannot do at all.
 *
 * The general version is not a lesser one. It is the honest answer when
 * nothing was declared, and it names the two directions rather than guessing.
 */
export function welcome(data: WelcomeData): EmailMessage {
  const greeting = hello(data.name);

  switch (data.role) {
    case "renter":
      return message(
        "Welcome to Vallo",
        "Start with search, and read the move-in cost before you plan a viewing.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You are here to find somewhere to live, so here is what is worth knowing before you start looking.`,
          ),
          paragraph(
            "Every listing on Vallo was put up by a real person on Vallo. Nothing is imported from an outside feed, so there is always somebody to message and somebody to inspect the place with.",
          ),
          paragraph(
            "The rent is rarely the whole number. Caution deposit, agency fee, legal fee, agreement fee and service charge are normal here, and together they are often half as much again. Where a listing states its total move-in cost, that is the figure to plan around.",
          ),
          bullets([
            "Search by area, then filter on the total move-in cost rather than the rent.",
            "Message the lister inside Vallo and ask your questions in writing.",
            "Inspect the property in person before any money moves.",
            "Pay through Vallo, so the money is held until the tenancy is real.",
          ]),
          button("Start searching", appUrl("/search")),
          note(
            "Nobody at Vallo will ever ask you to pay outside the platform. If somebody does, report them from the listing.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          MONEY_SAFETY_LINE,
        ],
      );

    case "buyer":
      return message(
        "Welcome to Vallo",
        "Start with search, and never let money move before a lawyer has seen the title.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You are here to buy, so the most useful thing we can tell you first is about title.`,
          ),
          paragraph(
            "Certificate of occupancy, governor's consent, deed of assignment, gazette, freehold and leasehold are not interchangeable words. Every listing for sale on Vallo states which one the seller claims, and states plainly when none was given.",
          ),
          paragraph(
            "We record the claim. We cannot verify it, and nobody who is not a lawyer at the land registry can. Have yours do a search before any money moves, however good the paperwork looks.",
          ),
          bullets([
            "Search by area and filter on the title you are willing to accept.",
            "Message the seller inside Vallo and keep every answer in writing.",
            "Inspect the property, and have a lawyer verify title at the registry.",
            "Pay through Vallo, so the money is held until the transaction completes.",
          ]),
          button("Browse property for sale", appUrl("/search")),
          note(
            "Nobody at Vallo will ever ask you to pay outside the platform. If somebody does, report them from the listing.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          MONEY_SAFETY_LINE,
        ],
      );

    case "landlord":
      return message(
        "Welcome to Vallo",
        "List your property, and get verified so people trust what you have written.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You have property to let, so here is what makes a listing on Vallo work.`,
          ),
          paragraph(
            "State the whole cost. Rent, caution deposit, agency, legal, agreement and service charge, and the total somebody actually has to find. Listings that state the total get far fewer wasted viewings, because the people who arrive have already decided they can afford it.",
          ),
          paragraph(
            "Then get verified. The badge is not decoration: it is how somebody scrolling past decides that you are real. The ladder runs from your phone number to your ID, then your address, then a physical inspection of the property.",
          ),
          bullets([
            "Add the property, with photographs and a walkthrough video if you can.",
            "Answer the light, water and gate questions. People filter on them.",
            "State the total move-in cost, not only the rent.",
            "Work up the verification ladder from Settings.",
          ]),
          button("List your property", appUrl("/agent/listings/new")),
          note(
            "Keep every conversation and payment inside Vallo. It is the record that protects you as much as it protects your tenant.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          LISTER_SAFETY_LINE,
        ],
      );

    case "seller":
      return message(
        "Welcome to Vallo",
        "List your property, and state the title you hold.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You have property to sell, so state your title first and everything else follows.`,
          ),
          paragraph(
            "Buyers on Vallo filter on title before they filter on price. A listing that names its certificate of occupancy or its governor's consent is taken seriously; one that says nothing is assumed to have nothing, whether or not that is fair.",
          ),
          paragraph(
            "Photographs sell a viewing, a walkthrough video sells the property. A continuous walk through the building and out to the gate answers more questions than twenty stills, and it is the thing a serious buyer asks for.",
          ),
          bullets([
            "Add the property, the asking price and the title you hold.",
            "Upload photographs, and a walkthrough video where you can.",
            "Work up the verification ladder from Settings.",
            "Answer enquiries inside Vallo, so the conversation is on the record.",
          ]),
          button("List your property", appUrl("/agent/listings/new")),
          note(
            "Keep every conversation and payment inside Vallo. It is the record that protects you as much as it protects your buyer.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          LISTER_SAFETY_LINE,
        ],
      );

    case "agent":
      return message(
        "Welcome to Vallo",
        "Apply to be verified, then list. Verification is what earns reach here.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You do this for a living, so the part worth your attention is verification.`,
          ),
          paragraph(
            "Vallo carries no listings from outside feeds. Everything here was put up by somebody here, and the verification ladder is how a reader tells one lister from another: phone, then identity document, then address, then a physical inspection of a property.",
          ),
          paragraph(
            "Reach follows the ladder. A verified agent's listings rank above an unverified one at equal relevance, and that is the only thing on this platform that money cannot buy.",
          ),
          bullets([
            "Apply from your profile: your details, your business area and a valid ID.",
            "Applications and verification documents are answered within 3 days.",
            "Once approved, publish listings and answer enquiries inside Vallo.",
            "State the full move-in cost on every rental. It is what people shop on.",
          ]),
          button("Apply to be an agent", appUrl("/agent/apply")),
          note(
            "Vallo charges you nothing to list or to be verified.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          LISTER_SAFETY_LINE,
        ],
      );

    default:
      return message(
        "Welcome to Vallo",
        "Everything here was listed by a real person. Here is how it works.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} Vallo is a Nigerian property marketplace for renting, buying and selling.`,
          ),
          paragraph(
            "Every listing was put up by a real person on Vallo. Nothing is imported from an outside feed, so there is always somebody to message, somebody to inspect the place with, and somebody accountable for what a listing says.",
          ),
          paragraph(
            "Money you pay through Vallo is held until the thing it was paid for has happened, and the person behind a listing climbs a verification ladder you can see: phone, identity document, address, then a physical inspection.",
          ),
          bullets([
            "Looking for somewhere: start with search and filter on the total move-in cost.",
            "Have property: add it from your profile and work up the verification ladder.",
          ]),
          button("Start searching", appUrl("/search")),
          note("Nobody at Vallo will ever ask you to pay outside the platform."),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          MONEY_SAFETY_LINE,
        ],
      );
  }
}

export type VerificationCodeData = {
  name?: string | null;
  /** The one-time code, already formatted for reading. */
  code: string;
  /** How long it lasts, in minutes. */
  expiresInMinutes: number;
};

/**
 * The sign-in or sign-up code.
 *
 * NO BUTTON, and that is the design. A code email teaches somebody what a code
 * email looks like, and every phishing message that follows will copy it. If
 * the real one has a big blue button, the reader has been trained to press one.
 * So there is nothing to press here: the code is the only thing in the message
 * and the reader types it into the tab they already have open.
 *
 * The subject carries the code as well. Most people read it from the
 * notification without opening anything, which is faster and strictly safer.
 */
export function verificationCode(data: VerificationCodeData): EmailMessage {
  return message(
    `${data.code} is your Vallo code`,
    `Your code expires in ${data.expiresInMinutes} minutes.`,
    [
      heading("Your Vallo code"),
      paragraph(`${hello(data.name)} Type this into the tab you have open.`),
      code(data.code),
      paragraph(
        `It expires in ${data.expiresInMinutes} minutes and works once. If it has run out, ask for another.`,
      ),
      note(
        "If you did not ask for this code, you can ignore this email. Nobody can use it without your inbox, and nothing has changed on your account.",
      ),
    ],
    [
      "You are receiving this because a code was requested for this address on Vallo.",
      "Vallo will never ask you for this code. Not by phone, not by message, not by email.",
    ],
  );
}

export type PasswordResetData = {
  name?: string | null;
  /** The one-time reset link. Absolute. */
  resetUrl: string;
  expiresInMinutes: number;
};

/** The password reset link. */
export function passwordReset(data: PasswordResetData): EmailMessage {
  return message(
    "Reset your Vallo password",
    `Your reset link expires in ${data.expiresInMinutes} minutes.`,
    [
      heading("Reset your password"),
      paragraph(
        `${hello(data.name)} Somebody asked to reset the password on this account. If that was you, set a new one here.`,
      ),
      button("Set a new password", data.resetUrl),
      paragraph(
        `The link expires in ${data.expiresInMinutes} minutes and works once.`,
      ),
      note(
        "If this was not you, ignore this email. Your password has not changed and nobody can change it without this link.",
      ),
    ],
    ["You are receiving this because a password reset was requested for this address."],
  );
}

/* ------------------------------------------------------------------ wallet */

export type WalletFundedData = {
  ownerName?: string | null;
  amountMinor: number;
  balanceMinor: number;
};

/** To the wallet owner when a funding lands in the ledger. */
export function walletFunded(data: WalletFundedData): EmailMessage {
  return message(
    `${money(data.amountMinor)} added to your Vallo wallet`,
    `Your wallet has been credited with ${money(data.amountMinor)}.`,
    [
      heading("Your wallet has been topped up"),
      paragraph(`${hello(data.ownerName)} Your payment has settled and your wallet is credited.`),
      rows([
        { label: "Added", value: money(data.amountMinor) },
        { label: "New balance", value: money(data.balanceMinor), strong: true },
      ]),
      paragraph(
        "The money is available now. You can spend it on Vallo, send it to another Vallo wallet, or withdraw it to your bank account.",
      ),
      button("Open my wallet", appUrl("/wallet")),
      note("Your full statement, every credit and debit, is in the wallet."),
    ],
    ["You are receiving this because your Vallo wallet was credited."],
  );
}

/** What happened to a withdrawal. One email, three honest endings. */
export type WithdrawalOutcome = "paid" | "failed" | "reversed";

export type WithdrawalOutcomeData = {
  ownerName?: string | null;
  outcome: WithdrawalOutcome;
  amountMinor: number;
  bankName?: string | null;
  accountLast4?: string | null;
  /** The wallet reference the money moved on. */
  reference?: string | null;
  /** The balance after the outcome settled, when it is known. */
  balanceMinor?: number;
};

/**
 * One message for every ending a withdrawal can have.
 *
 * Three functions would drift. The reader's question is the same in all three
 * cases and it is exactly two words long, "where is it", and the honest answer
 * differs only in one row and one paragraph. Keeping them together is what
 * guarantees that the failure email is as clear as the success one, which is
 * the way round that usually goes wrong.
 *
 * `reversed` is not a duplicate of `failed`. Failed means the bank refused it
 * and the money never left. Reversed means it left, came back, and somebody
 * will have seen a debit and then a credit. Telling somebody "it failed" when
 * their statement shows two entries is how a support ticket starts.
 */
export function withdrawalOutcome(data: WithdrawalOutcomeData): EmailMessage {
  const destination =
    (data.bankName ?? "").trim().length > 0
      ? `${(data.bankName ?? "").trim()}${
          (data.accountLast4 ?? "").trim().length > 0
            ? ` ****${(data.accountLast4 ?? "").trim()}`
            : ""
        }`
      : null;

  const paid = data.outcome === "paid";

  const outcomeLabel = paid
    ? "Sent to your bank"
    : data.outcome === "reversed"
      ? "Returned to your wallet by the bank"
      : "Not sent, money still in your wallet";

  const list: ReceiptRow[] = [{ label: "Amount", value: money(data.amountMinor) }];
  if (destination) list.push({ label: "Destination", value: destination });
  list.push({ label: "Outcome", value: outcomeLabel, strong: true });
  if (typeof data.balanceMinor === "number") {
    list.push({ label: "Wallet balance", value: money(data.balanceMinor) });
  }

  const explanation = paid
    ? "Banks normally credit within minutes, and can take up to one working day. Once it has left us, the timing is theirs."
    : data.outcome === "reversed"
      ? "The transfer left us and the bank sent it back, so you may see a debit and then a credit on your statement. The money is in your Vallo wallet now. This is almost always a name or account number that does not match."
      : "This is usually the account details, or a bank that is temporarily unreachable. Check the account number and the bank, then try the withdrawal again.";

  return message(
    paid
      ? `${money(data.amountMinor)} is on its way to your bank`
      : "Your withdrawal did not go through",
    paid
      ? `${money(data.amountMinor)} has left your Vallo wallet for your bank.`
      : `${money(data.amountMinor)} stays in your Vallo wallet.`,
    [
      heading(paid ? "Your withdrawal is on its way" : "Your withdrawal did not go through"),
      paragraph(
        paid
          ? `${hello(data.ownerName)} The transfer has left Vallo for your bank account.`
          : `${hello(data.ownerName)} The transfer to your bank did not complete, so the money is in your wallet and is available to you now.`,
      ),
      rows(list),
      paragraph(explanation),
      data.reference ? code(data.reference) : null,
      button("Open my wallet", appUrl("/wallet")),
      note(
        paid
          ? "If it has not arrived after one working day, contact support with the reference above and a person will trace it."
          : "If it fails a second time, contact support with the reference above and a person will look into it with you.",
      ),
    ],
    ["You are receiving this because of a withdrawal from your Vallo wallet."],
  );
}

/* ------------------------------------------------------------------ escrow */

export type EscrowFundedData = {
  payerName?: string | null;
  listingTitle: string;
  amountMinor: number;
  reference: string;
  /** What has to happen before the money is released. One plain sentence. */
  releaseCondition: string;
};

/**
 * To the payer when money enters escrow.
 *
 * The most important sentence in this email is the one that says the money has
 * not been paid to anybody. Somebody who has just parted with two million naira
 * needs to know exactly where it is sitting and exactly what causes it to move,
 * and a vague "your payment was successful" is what makes people ring the agent
 * in a panic.
 */
export function escrowFunded(data: EscrowFundedData): EmailMessage {
  return message(
    `${money(data.amountMinor)} is held in escrow for ${data.listingTitle}`,
    `Your money is held by Vallo and has not gone to anybody yet.`,
    [
      heading("Your money is held in escrow"),
      paragraph(
        `${hello(data.payerName)} Vallo is holding this money. It has not been paid to the lister and it will not be until the condition below is met.`,
      ),
      rows([
        { label: "Property", value: data.listingTitle },
        { label: "Held", value: money(data.amountMinor), strong: true },
        { label: "Reference", value: data.reference },
      ]),
      paragraph(`Released when: ${data.releaseCondition}`),
      paragraph(
        "If that does not happen, tell us and the money comes back to your wallet. That is what escrow is for and it is the reason to keep the payment on the platform.",
      ),
      button("View this transaction", appUrl("/wallet")),
      note(
        "Nobody at Vallo will ever ask you to release this money early, or to send anything further outside the platform.",
      ),
    ],
    [
      "You are receiving this because you paid into escrow on Vallo.",
      MONEY_SAFETY_LINE,
    ],
  );
}

export type EscrowReleasedData = {
  /** Whether this reader is the one who paid or the one being paid. */
  audience: "payer" | "recipient";
  name?: string | null;
  listingTitle: string;
  amountMinor: number;
  reference: string;
  /** What satisfied the condition. One plain sentence. */
  releasedBecause: string;
};

/**
 * When escrow pays out. Two audiences, one function.
 *
 * The payer and the recipient need the same facts and a different first
 * sentence, and writing them as one function is what keeps the amount, the
 * reference and the reason identical on both sides. Two people comparing two
 * emails about the same money must not find two different accounts of it.
 */
export function escrowReleased(data: EscrowReleasedData): EmailMessage {
  const toRecipient = data.audience === "recipient";
  return message(
    toRecipient
      ? `${money(data.amountMinor)} has been released to you`
      : `${money(data.amountMinor)} has been released for ${data.listingTitle}`,
    toRecipient
      ? `The money for ${data.listingTitle} is in your wallet.`
      : `The money you paid for ${data.listingTitle} has gone to the lister.`,
    [
      heading(toRecipient ? "The money is yours" : "Your escrow has been released"),
      paragraph(
        toRecipient
          ? `${hello(data.name)} The condition on this payment has been met, so Vallo has released the money into your wallet.`
          : `${hello(data.name)} The condition on this payment has been met, so Vallo has released the money to the lister.`,
      ),
      rows([
        { label: "Property", value: data.listingTitle },
        { label: "Released", value: money(data.amountMinor), strong: true },
        { label: "Reference", value: data.reference },
      ]),
      paragraph(`Released because: ${data.releasedBecause}`),
      button("Open my wallet", appUrl("/wallet")),
      note(
        toRecipient
          ? "Withdraw it to your bank whenever you want it, or leave it in your wallet."
          : "If you believe this was released in error, contact support with the reference above and a person will look at it.",
      ),
    ],
    ["You are receiving this because of an escrow payment on Vallo."],
  );
}

/* -------------------------------------------------------------- inspections */

export type InspectionScheduledData = {
  /** Whether this is the person viewing or the person showing. */
  audience: "viewer" | "lister";
  name?: string | null;
  listingTitle: string;
  address: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Already formatted for reading, e.g. "11:30". */
  time: string;
  /** The other party's name, so neither side meets an unnamed stranger. */
  otherPartyName?: string | null;
  /** The other party's phone, when they have shared it. */
  otherPartyPhone?: string | null;
};

/**
 * The viewing is booked.
 *
 * Both sides are about to travel across a Nigerian city to meet somebody they
 * have not met, which is the moment this platform owes the clearest safety
 * copy it has. The advice here is specific rather than general: daylight, tell
 * somebody where you are going, no money at the gate. A generic "stay safe"
 * helps nobody.
 */
export function inspectionScheduled(data: InspectionScheduledData): EmailMessage {
  const viewing = data.audience === "viewer";
  const other = greetingName(data.otherPartyName);

  const list: ReceiptRow[] = [
    { label: "Property", value: data.listingTitle },
    { label: "Address", value: data.address },
    { label: "Date", value: prettyDate(data.date) },
    { label: "Time", value: data.time, strong: true },
  ];
  if (other) {
    list.push({ label: viewing ? "Showing you round" : "Coming to view", value: other });
  }
  const phone = (data.otherPartyPhone ?? "").trim();
  if (phone.length > 0) list.push({ label: "Their number", value: phone });

  return message(
    `Inspection booked: ${data.listingTitle}, ${prettyDate(data.date)}`,
    `${prettyDate(data.date)} at ${data.time}.`,
    [
      heading("Your inspection is booked"),
      paragraph(
        viewing
          ? `${hello(data.name)} Your viewing is confirmed. Here is where to be and when.`
          : `${hello(data.name)} Somebody is coming to view your property. Here are the details.`,
      ),
      rows(list),
      paragraph(
        viewing
          ? "Take your time and ask about the things a photograph cannot show you: the light, the water, the road in the rain, and what the service charge actually covers."
          : "The questions people ask most are about light, water, the gate and what the service charge covers. Having the answers ready is what turns a viewing into a tenancy.",
      ),
      bullets(
        viewing
          ? [
              "Go in daylight where you can.",
              "Tell somebody where you are going and when you expect to be back.",
              "Do not carry money to a viewing and do not pay anything at the gate.",
              "Keep the conversation in Vallo, so there is a record of what was agreed.",
            ]
          : [
              "Confirm the time in Vallo so the record shows what was agreed.",
              "Never ask a viewer for money at the property. Payment goes through Vallo.",
              "If plans change, say so in the app rather than only by phone.",
            ],
      ),
      button("Open the conversation", appUrl("/messages")),
      note("If you need to change or cancel this, do it in the app so both sides are told."),
    ],
    [
      "You are receiving this because an inspection was arranged on Vallo.",
      viewing ? MONEY_SAFETY_LINE : LISTER_SAFETY_LINE,
    ],
  );
}

/* ---------------------------------------------------------------- listings */

export type ListingApprovedData = {
  listerName?: string | null;
  listingTitle: string;
  listingId: string;
};

/** To the lister when a listing passes review and goes live. */
export function listingApproved(data: ListingApprovedData): EmailMessage {
  return message(
    `Your listing is live: ${data.listingTitle}`,
    "It is published and people can find it now.",
    [
      heading("Your listing is live"),
      paragraph(
        `${hello(data.listerName)} It has passed review and is published, so it is in search now and people can message you about it.`,
      ),
      rows([
        { label: "Listing", value: data.listingTitle },
        { label: "Status", value: "Published", strong: true },
      ]),
      paragraph(
        "Two things bring in more enquiries than anything else: a walkthrough video, and stating the full move-in cost rather than the rent alone. Both can be added to a live listing.",
      ),
      button("View your listing", appUrl(`/listing/${data.listingId}`)),
      note("Answer enquiries quickly. People choose listers who reply."),
    ],
    [
      "You are receiving this because you have a listing on Vallo.",
      LISTER_SAFETY_LINE,
    ],
  );
}

export type ListingRejectedData = {
  listerName?: string | null;
  listingTitle: string;
  /** The reviewer's own words. Always sent, never summarised away. */
  reason: string;
  /** True when fixing the reason and resubmitting is the expected path. */
  canResubmit?: boolean;
};

/**
 * To the lister when a listing does not pass review.
 *
 * The reason is REQUIRED and is printed in the reviewer's own words. A
 * rejection with no reason is the single most infuriating message a platform
 * can send: it cannot be acted on, so the only remaining move is to file a
 * support ticket asking what it meant, and that is a cost this platform pays
 * for having been vague.
 *
 * The tone is deliberately not apologetic. Somebody whose listing was refused
 * wants to know what to change, not to be consoled about it.
 */
export function listingRejected(data: ListingRejectedData): EmailMessage {
  const again = data.canResubmit !== false;
  return message(
    `Your listing was not published: ${data.listingTitle}`,
    "Here is exactly what needs to change.",
    [
      heading("Your listing was not published"),
      paragraph(
        `${hello(data.listerName)} A person reviewed this listing and it cannot go live as it stands. This is what they said.`,
      ),
      rows([
        { label: "Listing", value: data.listingTitle },
        { label: "Reason", value: data.reason, strong: true },
      ]),
      paragraph(
        again
          ? "Make that change and submit it again. It goes back into the same queue and is usually answered within a day."
          : "This one cannot be resubmitted. If you think the decision is wrong, contact support and a person will look at it again.",
      ),
      button(again ? "Edit your listing" : "Contact support", appUrl(again ? "/agent/listings" : "/support")),
      note("Nothing has happened to your account, and your other listings are unaffected."),
    ],
    ["You are receiving this because you submitted a listing on Vallo."],
  );
}

/* ----------------------------------------------------------- verification */

/** The rungs of the ladder, in the order they are climbed. */
export type VerificationRung = "phone" | "identity" | "address" | "inspection";

export type VerificationRungPassedData = {
  name?: string | null;
  rung: VerificationRung;
  /** The next rung, when there is one. Null at the top. */
  nextRung?: VerificationRung | null;
};

const RUNG_NAME: Record<VerificationRung, string> = {
  phone: "Phone number",
  identity: "Identity document",
  address: "Address",
  inspection: "Property inspection",
};

const RUNG_MEANS: Record<VerificationRung, string> = {
  phone: "We have reached you on a Nigerian number that answers.",
  identity: "A person has checked your identity document against your name.",
  address: "A person has confirmed the address you gave is real and is yours.",
  inspection: "Somebody from Vallo has physically stood in your property.",
};

/**
 * To the lister when they climb a rung.
 *
 * Says what the rung MEANS rather than congratulating somebody on a badge. The
 * ladder is only worth climbing if each step is a specific claim, and the
 * person who passed it should be able to read what they are now allowed to
 * say about themselves.
 */
export function verificationRungPassed(data: VerificationRungPassedData): EmailMessage {
  const next = data.nextRung ?? null;
  return message(
    `Verified: ${RUNG_NAME[data.rung].toLowerCase()}`,
    `${RUNG_NAME[data.rung]} is confirmed on your Vallo account.`,
    [
      heading("Another rung confirmed"),
      paragraph(
        `${hello(data.name)} This check has passed and is now shown on your profile and on every listing you have.`,
      ),
      rows([
        { label: "Checked", value: RUNG_NAME[data.rung] },
        { label: "What it means", value: RUNG_MEANS[data.rung], strong: true },
      ]),
      paragraph(
        next
          ? `The next rung is ${RUNG_NAME[next].toLowerCase()}. Each one you pass is shown to everybody who looks at your listings, and verification is what earns reach here.`
          : "That is the top of the ladder. A physically inspected property is the strongest thing Vallo can say about a listing, and very few carry it.",
      ),
      button("View your profile", appUrl("/profile")),
      note("Vallo charges nothing for verification, at any rung."),
    ],
    ["You are receiving this because of a verification check on your Vallo account."],
  );
}

/* ---------------------------------------------------------------- enquiries */

export type NewEnquiryData = {
  listerName?: string | null;
  /** Who is asking. May be absent, and the copy handles that. */
  enquirerName?: string | null;
  listingTitle: string;
  /** Their message, as they wrote it. Truncated for the email, never edited. */
  preview: string;
  conversationPath: string;
};

/**
 * To the lister when somebody asks about a property.
 *
 * The preview is what makes this worth sending. "You have a new message" makes
 * somebody open an app to find out whether it mattered; the first two lines of
 * what was actually asked lets them decide from the notification, and reply
 * from the bus.
 *
 * Truncated rather than summarised. It is somebody else's writing and this
 * platform does not paraphrase people to each other.
 */
export function newEnquiry(data: NewEnquiryData): EmailMessage {
  const who = greetingName(data.enquirerName);
  const preview = data.preview.trim();
  const shown = preview.length > 240 ? preview.slice(0, 237) + "..." : preview;

  return message(
    `New enquiry about ${data.listingTitle}`,
    who ? `${who} has asked about ${data.listingTitle}.` : `Somebody has asked about ${data.listingTitle}.`,
    [
      heading("Somebody is asking about your property"),
      paragraph(
        `${hello(data.listerName)} ${
          who ? `${who} has` : "Somebody has"
        } sent you a message about this listing.`,
      ),
      rows([
        { label: "Listing", value: data.listingTitle },
        ...(who ? [{ label: "From", value: who }] : []),
        ...(shown.length > 0 ? [{ label: "They wrote", value: shown, strong: true }] : []),
      ]),
      paragraph(
        "Reply inside Vallo. Enquiries that are answered the same day turn into viewings far more often than ones answered the next week, and the conversation on the platform is the record that protects you both.",
      ),
      button("Reply in Vallo", appUrl(data.conversationPath)),
      note(
        "Never move a conversation off the platform, and never accept a payment outside it. Both are how people get defrauded in this market.",
      ),
    ],
    [
      "You are receiving this because somebody enquired about your Vallo listing.",
      LISTER_SAFETY_LINE,
    ],
  );
}

/* ---------------------------------------------------------------- bookings */

export type BookingRequestedData = {
  guestName?: string | null;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults?: number;
  children?: number;
  totalMinor: number;
  arriving?: ArrivingGuest | null;
};

/** To the guest, the moment their request is saved. */
export function bookingRequested(data: BookingRequestedData): EmailMessage {
  return message(
    `Your request for ${data.listingTitle} is with the host`,
    "Your dates are held while the host reviews your request.",
    [
      heading("Request sent"),
      paragraph(
        `${hello(data.guestName)} Your booking request has gone to the host and they are reviewing it now. Here is what you asked for.`,
      ),
      data.arriving
        ? paragraph(
            `You have booked this for ${data.arriving.name}. Once the host confirms, we will send them their dates and how to get in, and you will get your own copy here.`,
          )
        : null,
      rows(stayRows(data)),
      paragraph(
        "Your dates are held while the host reviews. We will email you the moment they confirm.",
      ),
      button("View my bookings", appUrl("/bookings")),
      note("You can follow the request, message the host or cancel it from your bookings."),
    ],
    [
      "You are receiving this because you requested a stay on Vallo.",
      MONEY_SAFETY_LINE,
    ],
  );
}

export type BookingRequestedHostData = {
  agentName?: string | null;
  guestName?: string | null;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults?: number;
  children?: number;
  totalMinor: number;
  arriving?: ArrivingGuest | null;
};

/** To the person who owns the listing. This one asks for an action. */
export function bookingRequestedHost(data: BookingRequestedHostData): EmailMessage {
  const who = greetingName(data.guestName);
  return message(
    `New booking request for ${data.listingTitle}`,
    `A guest has requested ${dateRange(data.checkIn, data.checkOut)}.`,
    [
      heading("A guest wants these dates"),
      paragraph(
        `${hello(data.agentName)} ${
          who ?? "A guest"
        } has requested a stay at your listing. The dates are held for you to review, so please confirm or decline as soon as you can.`,
      ),
      data.arriving
        ? paragraph(
            `This booking is for somebody else. ${data.arriving.name} is the person who will arrive, and ${data.arriving.phone} is the number to ring at the gate.`,
          )
        : null,
      rows(stayRows(data)),
      button("Review the request", appUrl("/agent/bookings")),
      note("Guests choose hosts who reply quickly, so an early answer helps your listing."),
    ],
    [
      "You are receiving this because you host this listing on Vallo.",
      LISTER_SAFETY_LINE,
    ],
  );
}

export type BookingConfirmedData = {
  guestName?: string | null;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalMinor: number;
  arriving?: ArrivingGuest | null;
  /**
   * The gate details, when this reader is the one arriving. Absent when
   * somebody else is: they get their own email carrying them, and repeating a
   * gate code to a payer in London helps nobody.
   */
  access?: ArrivalAccess | null;
};

/** To the guest when the host confirms. */
export function bookingConfirmed(data: BookingConfirmedData): EmailMessage {
  const gate = accessRows(data.access);
  return message(
    `Confirmed: ${data.listingTitle}`,
    `Your stay is confirmed for ${dateRange(data.checkIn, data.checkOut)}.`,
    [
      heading("Your stay is confirmed"),
      paragraph(
        `${hello(data.guestName)} Good news. The host has confirmed your booking, so these dates are yours.`,
      ),
      rows(stayRows(data)),
      gate.length > 0 ? paragraph("Here is how to get in when you arrive.") : null,
      rows(gate),
      data.arriving
        ? paragraph(
            `We have sent ${data.arriving.name} their own copy of the dates and the arrival details, so they have everything they need at the gate.`,
          )
        : null,
      paragraph(
        "Your booking now shows as confirmed in the app, where you can find the details and message the host.",
      ),
      button("View my booking", appUrl("/bookings")),
      note("Plans changed? You can cancel from your bookings before the stay begins."),
    ],
    [
      "You are receiving this because you booked a stay on Vallo.",
      MONEY_SAFETY_LINE,
    ],
  );
}

export type StayArrivalDetailsData = {
  /** The person arriving. They have no Vallo account and need none. */
  arrivingName: string;
  /** Who booked it for them, so this is not an email from a stranger. */
  bookedByName?: string | null;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  access?: ArrivalAccess | null;
};

/**
 * To the person actually arriving, when the payer is somebody else.
 *
 * Deliberately carries no money at all. The arriving guest did not pay and has
 * no business being told what their cousin spent, so there is no total, no
 * receipt figure and no payment link anywhere in it. What they need is where
 * they are going, when, and how to get past the gate.
 */
export function stayArrivalDetails(data: StayArrivalDetailsData): EmailMessage {
  const gate = accessRows(data.access);
  const booker = greetingName(data.bookedByName);
  return message(
    `Your stay at ${data.listingTitle} is confirmed`,
    `You are expected from ${dateRange(data.checkIn, data.checkOut)}.`,
    [
      heading("You are expected"),
      paragraph(
        `${hello(data.arrivingName)} ${
          booker ?? "Somebody"
        } has booked a stay for you on Vallo and the host has confirmed it. Here are your dates.`,
      ),
      rows([
        { label: "Stay", value: data.listingTitle },
        { label: "Dates", value: dateRange(data.checkIn, data.checkOut) },
        { label: "Length", value: nightsLine(data.nights) },
      ]),
      gate.length > 0
        ? paragraph("This is how to get in when you arrive.")
        : paragraph(
            "The host has not left gate instructions for this place. Whoever booked it for you can message the host from the app and pass on the directions.",
          ),
      rows(gate),
      note(
        "You do not need a Vallo account to stay here. Keep this email, and show it if anybody asks for it.",
      ),
    ],
    [
      "You are receiving this because somebody booked a Vallo stay for you.",
      MONEY_SAFETY_LINE,
    ],
  );
}

export type BookingCancelledData = {
  guestName?: string | null;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
};

/** To the guest when a booking is cancelled. Plain, no drama. */
export function bookingCancelled(data: BookingCancelledData): EmailMessage {
  return message(
    `Cancelled: ${data.listingTitle}`,
    `Your booking for ${dateRange(data.checkIn, data.checkOut)} is cancelled.`,
    [
      heading("Your booking is cancelled"),
      paragraph(
        `${hello(data.guestName)} This booking is now cancelled, and the dates have been released.`,
      ),
      rows([
        { label: "Stay", value: data.listingTitle },
        { label: "Dates", value: dateRange(data.checkIn, data.checkOut) },
        { label: "Status", value: "Cancelled", strong: true },
      ]),
      paragraph(
        "There is nothing left for you to do. The booking stays in your history for your records, and you are free to book other dates whenever you are ready.",
      ),
      button("Find another place", appUrl("/search")),
      note(
        "If you did not expect this cancellation, contact support from the app and a person will look into it.",
      ),
    ],
    [
      "You are receiving this because of a change to your Vallo booking.",
      MONEY_SAFETY_LINE,
    ],
  );
}

export type BookingRefundedData = {
  guestName?: string | null;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  /** What the guest had settled, in kobo. */
  paidMinor: number;
  /** What has just gone back to their wallet, in kobo. */
  refundMinor: number;
  /** What the host keeps, in kobo. Always paidMinor minus refundMinor. */
  retainedMinor: number;
  /** One plain sentence naming why this amount and not another. */
  reasonLine: string;
  /** The wallet reference the money moved on, when any money moved. */
  reference?: string | null;
};

/**
 * To the guest when Vallo support cancels a stay they had paid for.
 *
 * /cancellations promises them, in these words, "the amount and the reason in
 * writing". This is that promise, so it never leaves out either one, and it
 * never rounds: every figure is the exact kobo the ledger moved.
 *
 * A refund of nothing still sends. A guest who cancelled on check-in day is
 * owed the sentence explaining why nothing came back at least as much as a
 * guest who got everything is owed the good news.
 */
export function bookingRefunded(data: BookingRefundedData): EmailMessage {
  const returned = data.refundMinor > 0;
  const list: ReceiptRow[] = [
    { label: "Stay", value: data.listingTitle },
    { label: "Dates", value: dateRange(data.checkIn, data.checkOut) },
    { label: "You had paid", value: money(data.paidMinor) },
    { label: "Back in your wallet", value: money(data.refundMinor), strong: true },
  ];
  if (data.retainedMinor > 0) {
    list.push({ label: "Kept by the host", value: money(data.retainedMinor) });
  }

  return message(
    returned
      ? `${money(data.refundMinor)} is back in your Vallo wallet`
      : `Cancelled: ${data.listingTitle}`,
    returned
      ? `Your stay is cancelled and ${money(data.refundMinor)} has returned to your wallet.`
      : "Your stay is cancelled. Here is exactly how the amount was worked out.",
    [
      heading(returned ? "Your refund is in your wallet" : "Your stay is cancelled"),
      paragraph(
        `${hello(data.guestName)} A person at Vallo has cancelled this stay and released the dates.`,
      ),
      paragraph(data.reasonLine),
      rows(list),
      returned
        ? paragraph(
            "The money is in your Vallo wallet now. Spend it on another booking, or withdraw it to your bank from the wallet whenever you want it.",
          )
        : paragraph(
            "Nothing has been taken from you beyond what you had already paid for this stay, and the booking stays in your history for your records.",
          ),
      data.reference ? code(data.reference) : null,
      button(
        returned ? "Open your wallet" : "Find another place",
        appUrl(returned ? "/wallet" : "/search"),
      ),
      note(
        "If this amount does not look right to you, reply to support with the reference above and a person will go through it with you.",
      ),
    ],
    [
      "You are receiving this because of a change to your Vallo booking.",
      MONEY_SAFETY_LINE,
    ],
  );
}

/* ----------------------------------------------------------------- support */

export type SupportTicketFiledData = {
  name?: string | null;
  reference: string;
  topic?: string | null;
  /** The question as they wrote it, echoed back so they know what we hold. */
  body?: string | null;
};

/** To whoever filed the ticket, at the address they gave us. */
export function supportTicketFiled(data: SupportTicketFiledData): EmailMessage {
  const list: ReceiptRow[] = [];
  const topic = (data.topic ?? "").trim();
  if (topic.length > 0) list.push({ label: "Topic", value: topic });
  const question = (data.body ?? "").trim();
  if (question.length > 0) {
    list.push({
      label: "Your message",
      value: question.length > 300 ? question.slice(0, 297) + "..." : question,
    });
  }

  return message(
    `We have your message (${data.reference})`,
    `Your support reference is ${data.reference}.`,
    [
      heading("We have your message"),
      paragraph(
        `${hello(data.name)} Thank you for writing in. Your question is with our support team and a person will reply to this email address. Please keep this reference to hand.`,
      ),
      code(data.reference),
      rows(list),
      paragraph(
        "You do not need to do anything else. If you have more to add in the meantime, open support in the app and add it to this ticket.",
      ),
      button("Visit the help centre", appUrl("/help")),
      note(
        "Answers to the most common questions are in the help centre, often faster than waiting for a reply.",
      ),
    ],
    ["You are receiving this because a support request was filed with Vallo."],
  );
}

/**
 * The old name for withdrawalOutcome({ outcome: "failed" }).
 *
 * Kept because two call sites outside this module still import it, one of them
 * in a file this change does not own. It forwards rather than duplicating, so
 * there is one implementation and the copy cannot fork.
 */
export type WithdrawalFailedData = {
  ownerName?: string | null;
  amountMinor: number;
  bankName?: string | null;
  accountLast4?: string | null;
};

export function withdrawalFailed(data: WithdrawalFailedData): EmailMessage {
  return withdrawalOutcome({ ...data, outcome: "failed" });
}
