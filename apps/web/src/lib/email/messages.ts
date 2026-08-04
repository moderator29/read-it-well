/**
 * The RentMe transactional email catalogue.
 *
 * One function per message, each taking typed data and returning the subject
 * and the rendered HTML. Nothing here reads the environment beyond the site
 * URL used for links, nothing here sends: a message is a pure value, so it can
 * be inspected, diffed and reasoned about without a network.
 *
 * Copy rules, all binding. British spelling. Plain and calm, the tone of a
 * platform that tells you what happened and what happens next. No talk of
 * charges of any kind for using RentMe, because there are none. Money always
 * through money(), so kobo never reaches a reader as an integer. The booking
 * emails carry the one piece of safety guidance that matters most in the
 * footer: keep the conversation and the money inside RentMe, and inspect
 * before paying.
 */

import {
  appUrl,
  button,
  dateRange,
  heading,
  money,
  note,
  paragraph,
  receipt,
  referenceBox,
  shell,
  type ReceiptRow,
} from "./render";

/** What every message function returns: ready to hand to sendEmail. */
export type EmailMessage = {
  subject: string;
  html: string;
};

/** The safety line on booking emails, guest-facing. */
const GUEST_SAFETY_LINE =
  "Keep your chats and payments inside RentMe, and pay only after you have inspected.";

/** The same guidance, stated to a host about their guests. */
const HOST_SAFETY_LINE =
  "RentMe asks every guest to keep chats and payments inside RentMe and to pay only after inspecting.";

/** "Hello Ada." or, with no name to hand, "Hello." */
function hello(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? `Hello ${trimmed}.` : "Hello.";
}

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
 * admin, so putting them in these three emails discloses nothing new to
 * anybody who receives one.
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
  const rows: ReceiptRow[] = [
    { label: "Stay", value: data.listingTitle },
    { label: "Dates", value: dateRange(data.checkIn, data.checkOut) },
    { label: "Length", value: nightsLine(data.nights) },
  ];
  const party = partyLine(data.adults, data.children);
  if (party) rows.push({ label: "Guests", value: party });
  if (data.arriving) {
    rows.push({ label: "Arriving", value: data.arriving.name });
    rows.push({ label: "Their number", value: data.arriving.phone });
  }
  if (typeof data.totalMinor === "number") {
    rows.push({ label: "Total for the stay", value: money(data.totalMinor), strong: true });
  }
  return rows;
}

/**
 * The gate rows, or an empty list when the host has recorded nothing.
 *
 * An empty list renders no block at all rather than a heading over four blank
 * lines, because a panel with nothing in it reads as a bug and, worse, reads
 * as though the answer were "no gate".
 */
function accessRows(access?: ArrivalAccess | null): ReceiptRow[] {
  if (!access) return [];
  const rows: ReceiptRow[] = [];
  const push = (label: string, value: string | null | undefined, strong?: boolean) => {
    const trimmed = (value ?? "").trim();
    if (trimmed.length > 0) rows.push(strong ? { label, value: trimmed, strong } : { label, value: trimmed });
  };
  push("Estate", access.estateName);
  push("Getting in", access.gateDirections);
  push("Security desk", access.securityPhone);
  push("Gate code", access.accessCode, true);
  return rows;
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
  return {
    subject: `Your request for ${data.listingTitle} is with the host`,
    html: shell({
      preheader: `Your dates are held while the host reviews your request.`,
      body:
        heading("Request sent") +
        paragraph(
          `${hello(data.guestName)} Your booking request has gone to the host and they are reviewing it now. Here is what you asked for.`,
        ) +
        (data.arriving
          ? paragraph(
              `You have booked this for ${data.arriving.name}. Once the host confirms, we will send them their dates and how to get in, and you will get your own copy here.`,
            )
          : "") +
        receipt(stayRows(data)) +
        paragraph(
          "Your dates are held while the host reviews. We will email you the moment they confirm.",
        ) +
        button("View my bookings", appUrl("/bookings")) +
        note("You can follow the request, message the host or cancel it from your bookings."),
      footerLines: [
        "You are receiving this because you requested a stay on RentMe.",
        GUEST_SAFETY_LINE,
      ],
    }),
  };
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

/** To the agent who owns the listing. This one asks for an action. */
export function bookingRequestedHost(data: BookingRequestedHostData): EmailMessage {
  const who = (data.guestName ?? "").trim();
  return {
    subject: `New booking request for ${data.listingTitle}`,
    html: shell({
      preheader: `A guest has requested ${dateRange(data.checkIn, data.checkOut)}.`,
      body:
        heading("A guest wants these dates") +
        paragraph(
          `${hello(data.agentName)} ${
            who.length > 0 ? who : "A guest"
          } has requested a stay at your listing. The dates are held for you to review, so please confirm or decline as soon as you can.`,
        ) +
        (data.arriving
          ? paragraph(
              `This booking is for somebody else. ${data.arriving.name} is the person who will arrive, and ${data.arriving.phone} is the number to ring at the gate.`,
            )
          : "") +
        receipt(stayRows(data)) +
        button("Review the request", appUrl("/agent/bookings")) +
        note("Guests choose hosts who reply quickly, so an early answer helps your listing."),
      footerLines: [
        "You are receiving this because you host this listing on RentMe.",
        HOST_SAFETY_LINE,
      ],
    }),
  };
}

export type BookingConfirmedData = {
  guestName?: string | null;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalMinor: number;
};

/** To the guest when the host confirms. */
export function bookingConfirmed(data: BookingConfirmedData): EmailMessage {
  return {
    subject: `Confirmed: ${data.listingTitle}`,
    html: shell({
      preheader: `Your stay is confirmed for ${dateRange(data.checkIn, data.checkOut)}.`,
      body:
        heading("Your stay is confirmed") +
        paragraph(
          `${hello(data.guestName)} Good news. The host has confirmed your booking, so these dates are yours.`,
        ) +
        receipt(stayRows(data)) +
        paragraph(
          "Your booking now shows as confirmed in the app, where you can find the details and message the host.",
        ) +
        button("View my booking", appUrl("/bookings")) +
        note("Plans changed? You can cancel from your bookings before the stay begins."),
      footerLines: [
        "You are receiving this because you booked a stay on RentMe.",
        GUEST_SAFETY_LINE,
      ],
    }),
  };
}

export type BookingCancelledData = {
  guestName?: string | null;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
};

/** To the guest when a booking is cancelled. Plain, no drama. */
export function bookingCancelled(data: BookingCancelledData): EmailMessage {
  return {
    subject: `Cancelled: ${data.listingTitle}`,
    html: shell({
      preheader: `Your booking for ${dateRange(data.checkIn, data.checkOut)} is cancelled.`,
      body:
        heading("Your booking is cancelled") +
        paragraph(
          `${hello(data.guestName)} This booking is now cancelled, and the dates have been released.`,
        ) +
        receipt([
          { label: "Stay", value: data.listingTitle },
          { label: "Dates", value: dateRange(data.checkIn, data.checkOut) },
          { label: "Status", value: "Cancelled", strong: true },
        ]) +
        paragraph(
          "There is nothing left for you to do. The booking stays in your history for your records, and you are free to book other dates whenever you are ready.",
        ) +
        button("Find another stay", appUrl("/search")) +
        note("If you did not expect this cancellation, contact support from the app and a person will look into it."),
      footerLines: [
        "You are receiving this because of a change to your RentMe booking.",
        GUEST_SAFETY_LINE,
      ],
    }),
  };
}

/* ------------------------------------------------------------------ wallet */

export type WalletFundedData = {
  ownerName?: string | null;
  amountMinor: number;
  balanceMinor: number;
};

/** To the wallet owner when a funding lands in the ledger. */
export function walletFunded(data: WalletFundedData): EmailMessage {
  return {
    subject: `${money(data.amountMinor)} added to your RentMe wallet`,
    html: shell({
      preheader: `Your wallet has been credited with ${money(data.amountMinor)}.`,
      body:
        heading("Your wallet has been topped up") +
        paragraph(`${hello(data.ownerName)} Your payment has settled and your wallet is credited.`) +
        receipt([
          { label: "Added", value: money(data.amountMinor) },
          { label: "New balance", value: money(data.balanceMinor), strong: true },
        ]) +
        paragraph(
          "The money is available now. You can spend it on RentMe, send it to another RentMe wallet, or withdraw it to your bank account.",
        ) +
        button("Open my wallet", appUrl("/wallet")) +
        note("Your full statement, every credit and debit, is in the wallet."),
      footerLines: ["You are receiving this because your RentMe wallet was credited."],
    }),
  };
}

export type WithdrawalFailedData = {
  ownerName?: string | null;
  amountMinor: number;
  bankName?: string | null;
  accountLast4?: string | null;
};

/** To the wallet owner when a withdrawal is marked FAILED. */
export function withdrawalFailed(data: WithdrawalFailedData): EmailMessage {
  const destination =
    (data.bankName ?? "").trim().length > 0
      ? `${(data.bankName ?? "").trim()}${
          (data.accountLast4 ?? "").trim().length > 0 ? ` ****${(data.accountLast4 ?? "").trim()}` : ""
        }`
      : null;

  const rows: ReceiptRow[] = [{ label: "Amount", value: money(data.amountMinor) }];
  if (destination) rows.push({ label: "Destination", value: destination });
  rows.push({ label: "Outcome", value: "Not sent, money returned to your wallet", strong: true });

  return {
    subject: "Your withdrawal did not go through",
    html: shell({
      preheader: `${money(data.amountMinor)} stays in your wallet.`,
      body:
        heading("Your withdrawal did not go through") +
        paragraph(
          `${hello(data.ownerName)} The transfer to your bank did not complete, so nothing left your wallet. The money stays where it is and is available to you now.`,
        ) +
        receipt(rows) +
        paragraph(
          "This is usually the account details or a bank that is temporarily unreachable. Check the account number and the bank, then try the withdrawal again.",
        ) +
        button("Open my wallet", appUrl("/wallet")) +
        note("If it fails a second time, contact support from the app and a person will look into it with you."),
      footerLines: ["You are receiving this because of a withdrawal from your RentMe wallet."],
    }),
  };
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
  const rows: ReceiptRow[] = [];
  const topic = (data.topic ?? "").trim();
  if (topic.length > 0) rows.push({ label: "Topic", value: topic });
  const question = (data.body ?? "").trim();
  if (question.length > 0) {
    rows.push({
      label: "Your message",
      value: question.length > 300 ? question.slice(0, 297) + "..." : question,
    });
  }

  return {
    subject: `We have your message (${data.reference})`,
    html: shell({
      preheader: `Your support reference is ${data.reference}.`,
      body:
        heading("We have your message") +
        paragraph(
          `${hello(data.name)} Thank you for writing in. Your question is with our support team and a person will reply to this email address. Please keep this reference to hand.`,
        ) +
        referenceBox(data.reference) +
        (rows.length > 0 ? receipt(rows) : "") +
        paragraph(
          "You do not need to do anything else. If you have more to add in the meantime, open support in the app and add it to this ticket.",
        ) +
        button("Visit the help centre", appUrl("/help")) +
        note("Answers to the most common questions are in the help centre, often faster than waiting for a reply."),
      footerLines: ["You are receiving this because a support request was filed with RentMe."],
    }),
  };
}
