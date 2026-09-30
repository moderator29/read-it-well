import { countOf } from "@vallo/i18n/core";
import { OFF_PLATFORM_SENTENCE } from "../money/copy";
import { appUrl, button, clip, compose, fitSubject, heading, hello, money, note, paragraph, quoteLine, prettyDate, rows, type Block } from "./render";
import type { EmailKind } from "./icons";
import type { EmailMessage } from "./messages";

/**
 * THE LIFECYCLE EMAILS (29 September 2026).
 *
 * The events the product already announced in the app and never by email:
 * a viewing offered another time, declined, withdrawn or done; a support
 * reply; an agreement both sides confirmed, or cancelled; a guarantee claim
 * received; a verification step that did not pass; a listing sent for review;
 * a table confirmed or cancelled; a refund asked for. Each one is written by a
 * database trigger into `public.email_outbox` in the same transaction as the
 * change (migration in `supabase/migrations/pending/`, see
 * `docs/email/WHAT_SENDS.md`), and built here from what that trigger writes.
 *
 * Every one follows the shell's shape: one headline, a short paragraph, the
 * facts in a quiet table, at most one button, and a footer that says why it
 * arrived. None of them promises anything about money beyond what happened,
 * and none of them carries a phone number or an address the other party did
 * not already share in the app.
 */

function message(
  icon: EmailKind,
  subject: string,
  preheader: string,
  blocks: readonly (Block | null | false)[],
  footer: string,
  footerLink?: { label: string; href: string },
): EmailMessage {
  const composed = compose({ icon, preheader, blocks, footerLines: [footer], footerLink });
  return { subject, preheader: composed.preheader, html: composed.html, text: composed.text };
}

const BOOKINGS_SWITCH = { label: "Change what Vallo emails you", href: appUrl("/settings/notifications") };

/* ------------------------------------------------------------- inspections */

export type InspectionChangeData = {
  name: string | null;
  listingTitle: string;
  /** "YYYY-MM-DD" and "HH:MM", Lagos time, when a time is part of the news. */
  date?: string | null;
  time?: string | null;
  otherPartyName?: string | null;
  /** The lister's own words, when they gave any. */
  note?: string | null;
};

const when = (data: InspectionChangeData) =>
  data.date && data.time ? `${prettyDate(data.date)}, ${data.time}` : null;

/** The lister offered a different time. To the person who asked. */
export function inspectionProposed(data: InspectionChangeData): EmailMessage {
  const at = when(data);
  return message(
    "inspectionProposed",
    fitSubject("New viewing time offered", data.listingTitle),
    at ? `The lister offered ${at} instead. Accept it in the app.` : "The lister offered another time. Accept it in the app.",
    [
      heading("New viewing time offered"),
      paragraph(
        `${hello(data.name)} The lister of ${data.listingTitle} cannot do the time you asked for and has offered another. Accept it in the app, or reply in the conversation to find one that suits you both.`,
      ),
      rows([
        { label: "Property", value: data.listingTitle },
        ...(at ? [{ label: "Time offered", value: at, strong: true }] : []),
      ]),
      button("See the offer", appUrl("/inspections")),
      note(OFF_PLATFORM_SENTENCE),
    ],
    "You are receiving this because you asked to view a property on Vallo.",
    BOOKINGS_SWITCH,
  );
}

/** The lister declined. To the person who asked. */
export function inspectionDeclined(data: InspectionChangeData): EmailMessage {
  return message(
    "inspectionDeclined",
    fitSubject("Viewing declined", data.listingTitle),
    data.note ? quoteLine("The lister said", data.note) : "The lister cannot show it at that time. Nothing was charged.",
    [
      heading("Viewing declined"),
      paragraph(
        `${hello(data.name)} The lister of ${data.listingTitle} cannot show it at the time you asked for. Nothing has been charged.`,
      ),
      data.note ? rows([{ label: "From the lister", value: data.note }]) : null,
      paragraph("You can ask for another time, or look at similar places."),
      button("Find another viewing", appUrl("/search")),
    ],
    "You are receiving this because you asked to view a property on Vallo.",
    BOOKINGS_SWITCH,
  );
}

/** The person who asked withdrew. To the lister. */
export function inspectionWithdrawn(data: InspectionChangeData): EmailMessage {
  const at = when(data);
  return message(
    "inspectionWithdrawn",
    fitSubject("Viewing withdrawn", data.listingTitle),
    clip(`${data.otherPartyName ?? "The viewer"} no longer needs the viewing${at ? ` on ${at}` : ""}. Nothing to do.`, 90),
    [
      heading("Viewing withdrawn"),
      paragraph(
        `${hello(data.name)} ${data.otherPartyName ?? "The person who asked"} no longer needs to see ${data.listingTitle}. You do not need to do anything.`,
      ),
      at ? rows([{ label: "Was booked for", value: at }]) : null,
      button("Open your viewings", appUrl("/agent/inspections")),
    ],
    "You are receiving this because somebody asked to view your listing on Vallo.",
    BOOKINGS_SWITCH,
  );
}

/** The visit is recorded as done. To both sides, each told the next step on their side. */
export function inspectionCompleted(data: InspectionChangeData & { audience: "viewer" | "lister" }): EmailMessage {
  const viewer = data.audience === "viewer";
  return message(
    "inspectionCompleted",
    fitSubject("Viewing done", data.listingTitle),
    viewer
      ? "Next is the agreement, which you both confirm before anything is paid."
      : clip(`The visit${data.otherPartyName ? ` by ${data.otherPartyName}` : ""} is recorded as done.`, 90),
    [
      heading("Viewing done"),
      paragraph(
        viewer
          ? `${hello(data.name)} Your visit to ${data.listingTitle} is recorded as done. If you want to go ahead, the next step is the agreement, which you both confirm in the app before anything is paid.`
          : `${hello(data.name)} The visit to ${data.listingTitle}${data.otherPartyName ? ` by ${data.otherPartyName}` : ""} is recorded as done.`,
      ),
      button(viewer ? "See what comes next" : "Open your viewings", appUrl(viewer ? "/inspections" : "/agent/inspections")),
      note(OFF_PLATFORM_SENTENCE),
    ],
    viewer
      ? "You are receiving this because you viewed a property through Vallo."
      : "You are receiving this because somebody viewed your listing through Vallo.",
    BOOKINGS_SWITCH,
  );
}

/* ----------------------------------------------------------------- support */

export type SupportRepliedData = {
  name: string | null;
  reference: string;
  ticketId: string;
  /** The first words of the reply, as written. */
  preview: string | null;
};

const PREVIEW_LENGTH = 280;

/** Somebody at Vallo answered a ticket. To the person who filed it. */
export function supportReplied(data: SupportRepliedData): EmailMessage {
  const preview =
    data.preview && data.preview.length > PREVIEW_LENGTH
      ? data.preview.slice(0, PREVIEW_LENGTH).replace(/\s+\S*$/, "") + "..."
      : data.preview;
  return message(
    "supportReplied",
    `Support replied: ${data.reference}`,
    preview ? clip(`"${preview}"`, 90) : "Somebody at Vallo answered your request. Read it in the app.",
    [
      heading("Support replied"),
      paragraph(`${hello(data.name)} Somebody at Vallo has answered your request. Read the whole reply and answer it in the app.`),
      rows([
        { label: "Reference", value: data.reference, strong: true },
        ...(preview ? [{ label: "Reply", value: preview }] : []),
      ]),
      button("Read the reply", appUrl(`/support/messages/${data.ticketId}`)),
      note("Vallo support will never ask you for a password, a code or a card number."),
    ],
    "You are receiving this because you asked Vallo for help.",
  );
}

/* -------------------------------------------------------------- agreements */

export type AgreementChangeData = {
  name: string | null;
  viewer: "renter" | "owner";
  listingTitle: string | null;
  amountMinor: number;
  agreementId: string;
};

const placeOf = (data: AgreementChangeData) => data.listingTitle ?? "the property";

/** Both sides confirmed the same terms and it is with Vallo. To both. */
export function agreementSubmitted(data: AgreementChangeData): EmailMessage {
  return message(
    "agreementSubmitted",
    fitSubject("Both sides confirmed", data.listingTitle ?? "the agreement"),
    `${money(data.amountMinor)} agreed. Vallo reviews it next, and nothing is paid yet.`,
    [
      heading("Both sides confirmed"),
      paragraph(
        `${hello(data.name)} You and the other party confirmed the same terms for ${placeOf(data)}. A person at Vallo now reviews the agreement, and you will both be told the decision. Nothing is paid until it is approved.`,
      ),
      rows([
        { label: "Property", value: placeOf(data) },
        { label: "Total agreed", value: money(data.amountMinor), strong: true },
      ]),
      button("Open the agreement", appUrl(`/agreements/${data.agreementId}`)),
      note(OFF_PLATFORM_SENTENCE),
    ],
    "You are receiving this because you are a party to an agreement on Vallo.",
  );
}

/** The agreement was cancelled. To both. */
export function agreementCancelled(data: AgreementChangeData): EmailMessage {
  return message(
    "agreementCancelled",
    fitSubject("Agreement cancelled", data.listingTitle),
    "It is closed, nothing further happens on it, and nothing is charged for it.",
    [
      heading("Agreement cancelled"),
      paragraph(
        `${hello(data.name)} The agreement for ${placeOf(data)} has been cancelled and is closed. Nothing further happens on it, and nothing is charged for it.`,
      ),
      rows([{ label: "Property", value: placeOf(data) }]),
      button("Open the agreement", appUrl(`/agreements/${data.agreementId}`)),
    ],
    "You are receiving this because you are a party to an agreement on Vallo.",
  );
}

/* --------------------------------------------------------------- guarantee */

export type ClaimOpenedData = {
  name: string | null;
  agreementId: string;
  requestedMinor: number | null;
};

/** A claim on the Vallo Guarantee was received. To the person who made it. */
export function guaranteeClaimOpened(data: ClaimOpenedData): EmailMessage {
  return message(
    "guaranteeClaimOpened",
    "Vallo Guarantee claim received",
    data.requestedMinor !== null
      ? `Your claim for ${money(data.requestedMinor)} is with Vallo, to review against the inspection report.`
      : "Your claim is with Vallo, to review against the inspection report.",
    [
      heading("Claim received"),
      paragraph(
        `${hello(data.name)} Your claim on the Vallo Guarantee has arrived. A person at Vallo reviews it against the inspection report and the evidence you sent, and you will be told the decision by email and in the app.`,
      ),
      data.requestedMinor !== null ? rows([{ label: "Amount claimed", value: money(data.requestedMinor), strong: true }]) : null,
      button("Open the agreement", appUrl(`/agreements/${data.agreementId}`)),
    ],
    "You are receiving this because you made a claim on the Vallo Guarantee.",
  );
}

/* ------------------------------------------------------------ verification */

export type RungFailedData = {
  name: string | null;
  /** The step, in words: "Identity", "Address", "In-person check". */
  stepName: string;
  /** The reviewer's own words, when they gave any. */
  note: string | null;
};

/** A verification step did not pass. To the lister. */
export function verificationRungFailed(data: RungFailedData): EmailMessage {
  return message(
    "verificationRungFailed",
    `Your ${data.stepName.toLowerCase()} check did not pass`,
    data.note ? quoteLine("The reviewer said", data.note) : "Your verification page says what the step needs.",
    [
      heading(`${data.stepName} check did not pass`),
      paragraph(
        `${hello(data.name)} A person at Vallo reviewed this step of your verification and it did not pass this time. The reviewer's words are below. You can see where you stand, and what the step needs, on your verification page.`,
      ),
      data.note ? rows([{ label: "From the reviewer", value: data.note }]) : null,
      button("See your verification", appUrl("/agent/verification")),
    ],
    "You are receiving this because you are verifying your account on Vallo.",
  );
}

/* ---------------------------------------------------------------- listings */

export type ListingSubmittedData = { name: string | null; listingTitle: string };

/** A listing was sent for review. To the lister, as a receipt. */
export function listingSubmitted(data: ListingSubmittedData): EmailMessage {
  return message(
    "listingSubmitted",
    fitSubject("Listing sent for review", data.listingTitle),
    "A person reads it before it goes live. We will tell you the outcome.",
    [
      heading("Listing sent for review"),
      paragraph(
        `${hello(data.name)} ${data.listingTitle} is with Vallo. A person reads every listing before it goes live, and you will be told by email and in the app when it is approved or if anything needs changing.`,
      ),
      button("Open your listings", appUrl("/agent/listings")),
    ],
    "You are receiving this because you sent a listing to Vallo.",
  );
}

/* ------------------------------------------------------------ reservations */

export type ReservationData = {
  name: string | null;
  placeName: string;
  /** "YYYY-MM-DD" and "HH:MM", Lagos time. */
  date: string | null;
  time: string | null;
  partySize: number | null;
};

function reservationRows(data: ReservationData) {
  return rows([
    { label: "Place", value: data.placeName },
    ...(data.date && data.time ? [{ label: "When", value: `${prettyDate(data.date)}, ${data.time}`, strong: true }] : []),
    ...(data.partySize ? [{ label: "Party", value: countOf(data.partySize, "guests", "en") }] : []),
  ]);
}

/** "Terra Kulture confirmed 4 Oct 2026 at 19:30, 4 guests." The lock-screen line. */
function reservationLine(data: ReservationData, outcome: "confirmed" | "cancelled"): string {
  const at = data.date && data.time ? ` for ${prettyDate(data.date)} at ${data.time}` : "";
  const party = data.partySize ? `, ${countOf(data.partySize, "guests", "en")}` : "";
  return clip(
    outcome === "confirmed"
      ? `${data.placeName} confirmed your table${at}${party}.`
      : `Your table at ${data.placeName}${at} is cancelled.`,
    90,
  );
}

/** The restaurant confirmed the table. To the guest. */
export function reservationConfirmed(data: ReservationData): EmailMessage {
  return message(
    "reservationConfirmed",
    fitSubject("Table confirmed", data.placeName),
    reservationLine(data, "confirmed"),
    [
      heading("Table confirmed"),
      paragraph(`${hello(data.name)} ${data.placeName} has confirmed your reservation.`),
      reservationRows(data),
      button("See your reservation", appUrl("/bookings")),
    ],
    "You are receiving this because you reserved a table through Vallo.",
    BOOKINGS_SWITCH,
  );
}

/** The table was cancelled. To the guest. */
export function reservationCancelled(data: ReservationData): EmailMessage {
  return message(
    "reservationCancelled",
    fitSubject("Table cancelled", data.placeName),
    reservationLine(data, "cancelled"),
    [
      heading("Reservation cancelled"),
      paragraph(`${hello(data.name)} Your reservation at ${data.placeName} is cancelled.`),
      reservationRows(data),
      button("Find another table", appUrl("/restaurants")),
    ],
    "You are receiving this because you reserved a table through Vallo.",
    BOOKINGS_SWITCH,
  );
}

/* ----------------------------------------------------------------- refunds */

export type RefundRequestedData = {
  name: string | null;
  bookingId: string;
  /** "YYYY-MM-DD", the date Vallo has committed to answer by. */
  dueBy: string | null;
};

/** A refund was asked for on a booking. To the guest, as a receipt. */
export function refundRequested(data: RefundRequestedData): EmailMessage {
  return message(
    "refundRequested",
    "Refund request received",
    data.dueBy
      ? `A person at Vallo answers it by ${prettyDate(data.dueBy)}.`
      : "A person at Vallo looks at it and tells you the outcome.",
    [
      heading("Refund request received"),
      paragraph(
        `${hello(data.name)} Your refund request has arrived. A person at Vallo looks at it against the booking's cancellation terms and tells you the outcome by email and in the app.`,
      ),
      data.dueBy ? rows([{ label: "Answer by", value: prettyDate(data.dueBy), strong: true }]) : null,
      button("Open the booking", appUrl(`/bookings/${data.bookingId}`)),
    ],
    "You are receiving this because you asked for a refund on Vallo.",
    BOOKINGS_SWITCH,
  );
}
