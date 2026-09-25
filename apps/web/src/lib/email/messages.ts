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
 *   No marketing. Nobody opens a receipt to be sold to. There is no
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

import { REFUND_ROUTE } from "../money/copy";
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
import { countOf } from "@vallo/i18n/core";

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
  if (grownUps > 0) parts.push(countOf(grownUps, "adults"));
  if (little > 0) parts.push(countOf(little, "children"));
  return parts.join(" and ");
}

function nightsLine(nights: number): string {
  return countOf(nights, "nights");
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
  footerLink?: { label: string; href: string },
): EmailMessage {
  const { html, text } = compose({
    preheader,
    blocks,
    ...(footerLines ? { footerLines } : {}),
    ...(footerLink ? { footerLink } : {}),
  });
  return { subject, html, text };
}

/* ------------------------------------------------------------------ account */

export { welcome, type SignupRole, type WelcomeData } from "./welcome-message";

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

/**
 * The password reset link.
 *
 * THIS ONE HAS A BUTTON AND THE CODE EMAIL DOES NOT, WHICH IS A DECISION
 * RATHER THAN AN INCONSISTENCY. A reset genuinely needs a link, because there
 * is no six digit recovery screen on this platform and the session the link
 * creates is what `updatePassword` acts on. A code email needs nothing
 * pressed, so it offers nothing pressable, and the two shapes stay different
 * on purpose: the reader learns that Vallo never sends a button to press for a
 * code, which is the habit that makes the phishing copy of a code email fail.
 *
 * The destination is also printed underneath, selectable. This button IS the
 * message: if a mail gateway rewrites the anchor, or the reader wants to
 * finish on a desktop, a dead button with no address beneath it is a locked
 * account rather than an inconvenience.
 *
 * ---------------------------------------------------------------------------
 * DELIBERATELY NOT WIRED, AND IT MUST NOT BE. GoTrue ALREADY SENDS THIS ONE.
 *
 * `lib/auth/actions.ts` asks for a reset with
 * `supabase.auth.resetPasswordForEmail`, and GoTrue composes and sends the
 * recovery mail itself from its own template, carrying the only link that
 * works: the recovery token is minted inside GoTrue and never reaches this
 * process. THERE IS NO `resetUrl` FOR A CALLER HERE TO PASS. Anything this
 * platform built would therefore be a SECOND email, arriving beside the real
 * one, with either no link or a link that does not sign anybody in, on the
 * one screen where a person is already locked out and frightened. Two reset
 * emails is how somebody presses the wrong one and concludes they have been
 * phished.
 *
 * It is kept rather than deleted: the fixtures render it, `shell.test.ts` holds it to the catalogue's structure,
 * and the day the Send Email Hook is switched on (`app/api/auth/email-hook`,
 * built and not enabled) the recovery payload arrives here and this becomes
 * the message for it. Until that day it has no caller ON PURPOSE, and
 * `reachability.test.ts` holds that refusal in place so nobody quietly wires
 * it.
 */
export function passwordReset(data: PasswordResetData): EmailMessage {
  return message(
    "Set a new Vallo password",
    "A way back into your Vallo account.",
    [
      heading("Set a new password"),
      paragraph(
        `${hello(data.name)} Somebody asked to reset the password on this account. If that was you, set a new one here.`,
      ),
      button("Set a new password", data.resetUrl, true),
      paragraph(
        `The link expires in ${data.expiresInMinutes} minutes and works once. Open it on the same device you asked from.`,
      ),
      note(
        "If this was not you, ignore this email. Your password has not changed and nobody can change it without this link.",
      ),
    ],
    ["You are receiving this because a password reset was requested for this address."],
  );
}

/* ----------------------------------------------------------- security notices */

/**
 * THE TWO MESSAGES BELOW ARE NEVER MUTED, AND WHOEVER WIRES THEM MUST NOT PUT
 * THEM BEHIND A CHANNEL.
 *
 * `emailMuted` exists so the promise on the settings card is checkable: turn
 * Bookings off and no booking email is sent. These two are not on a channel
 * and must never be given one. A person who has switched Vallo's email off has
 * switched off news about their bookings, not the only signal that somebody
 * else is inside their account, and the account they would lose is the one
 * holding their payment history. There is no quiet hours rule on them either:
 * a notice that somebody took your account is worth a phone lighting up at
 * three in the morning, which is the entire point of it.
 *
 * Both are written to be read in four seconds by somebody who is already
 * alarmed. One sentence saying what happened, one saying what to do if it was
 * them, which is nothing, and one saying what to do if it was not.
 *
 * Neither prints an IP address. A city and a parsed device name tell the
 * reader what they need in order to recognise themselves; the raw address
 * tells them nothing they can act on, is personal data in an unencrypted
 * mailbox, and is the sort of thing that ends up quoted in a support thread.
 */

/** Only the rows we actually have. A fact we cannot produce is not printed. */
function securityRows(data: {
  date?: string | null;
  time?: string | null;
  device?: string | null;
  place?: string | null;
}): ReceiptRow[] {
  const list: ReceiptRow[] = [];
  const when = [data.date ? prettyDate(data.date) : null, data.time?.trim() || null]
    .filter(Boolean)
    .join(", ");
  if (when) list.push({ label: "When", value: when });
  if (data.device?.trim()) list.push({ label: "Device", value: data.device.trim() });
  if (data.place?.trim()) list.push({ label: "Near", value: data.place.trim() });
  return list;
}

export type PasswordChangedData = {
  name?: string | null;
  /** ISO date of the change. Omitted when the caller cannot say. */
  date?: string | null;
  /** "14:05", already resolved to the reader's own time zone by the caller. */
  time?: string | null;
};

/**
 * The password on this account was changed.
 *
 * Every product owes this one and this product did not have it. It is the
 * message that turns a silent takeover into a loud one: somebody who phishes a
 * password changes it immediately, and if nothing leaves the building at that
 * moment the real owner finds out when they next try to sign in, which can be
 * weeks. The window this email opens is the difference between an account
 * recovered and an account gone.
 *
 * It carries a way back in, and prints the address as well as linking it. A
 * reader who did not make this change cannot sign in to find the reset screen,
 * so telling them to go and look for it is telling them to do the one thing
 * they cannot do.
 */
export function passwordChanged(data: PasswordChangedData): EmailMessage {
  const when = securityRows({ date: data.date, time: data.time });
  return message(
    "Your Vallo password was changed",
    "If this was not you, there is a way back in.",
    [
      heading("Your password was changed"),
      paragraph(`${hello(data.name)} The password on your Vallo account has been changed.`),
      rows(when),
      paragraph("If that was you, there is nothing to do and you can ignore this message."),
      paragraph(
        "If it was not you, somebody else knows your password. Set a new one now, before anything else.",
      ),
      button("Set a new password", appUrl("/forgot-password"), true),
      note(
        "Vallo will never ask you for your password, by phone, by message or by email. If somebody does, it is not us.",
      ),
    ],
    [
      "You are receiving this because the password on this address was changed.",
      "This is a security notice. It is always sent and it cannot be switched off.",
    ],
  );
}

/* ------------------------------------------------- staff email recovery */

export type EmailRecoveryData = {
  name?: string | null;
  /** The new address, already masked by the caller ("n***@example.com"). */
  newAddressMasked: string;
  /** "24 September 2026, 14:05", already formatted by the caller. */
  eligibleAt?: string | null;
};

/**
 * SEC-15. Sent to the OLD address the moment support opens a request to move
 * the account to another address, so a person whose account is being taken
 * has the whole cooling-off to stop it.
 */
export function emailRecoveryOpened(data: EmailRecoveryData): EmailMessage {
  return message(
    "A request to move your Vallo account to another email address",
    "If this was not you, tell us before it completes.",
    [
      heading("Somebody asked to move your account"),
      paragraph(
        `${hello(data.name)} Our support team has opened a request to move your Vallo account from this address to ${data.newAddressMasked}, after checking the NIN on your identity record.`,
      ),
      rows([{ label: "It completes, at the earliest", value: data.eligibleAt ?? "in 72 hours" }]),
      paragraph("If that was you, there is nothing to do. Nothing changes before the time above."),
      paragraph(
        "If it was not you, cancel it from Settings, Privacy while you can still sign in, or contact us now. The request is cancelled and your account stays at this address.",
      ),
      button("Contact us", appUrl("/contact"), true),
    ],
    [
      "You are receiving this because it is the address on the account.",
      "This is a security notice. It is always sent and it cannot be switched off.",
    ],
  );
}

/** SEC-15. Sent to the OLD address once the move has happened. */
export function emailRecoveryCompleted(data: EmailRecoveryData): EmailMessage {
  return message(
    "Your Vallo account has moved to another email address",
    "Sign-in and messages now go to the new address.",
    [
      heading("Your account has moved"),
      paragraph(
        `${hello(data.name)} Your Vallo account now signs in with ${data.newAddressMasked}. This address no longer reaches it.`,
      ),
      paragraph("If this was not you, contact us straight away and quote this email."),
      button("Contact us", appUrl("/contact"), true),
    ],
    [
      "You are receiving this because it was the address on the account.",
      "This is a security notice. It is always sent and it cannot be switched off.",
    ],
  );
}

export type NewDeviceSignInData = {
  name?: string | null;
  /** ISO date of the sign-in. */
  date?: string | null;
  /** "14:05", already resolved to the reader's own time zone by the caller. */
  time?: string | null;
  /** "Chrome on Windows", parsed. Never the raw user agent string. */
  device?: string | null;
  /** "Abuja, Nigeria". City level at most, and never an IP address. */
  place?: string | null;
};

/**
 * Somebody signed in from a device this account has not seen before.
 *
 * The other half of the pair, and the earlier warning of the two: a stolen
 * password is used before it is changed. It is deliberately not alarming in
 * its own right, because most of these are the owner on a new phone, and an
 * email that shouts at somebody for buying a laptop is an email they learn to
 * delete unread. It states the facts and puts the two actions in order.
 *
 * Its button goes to the device list rather than to a password reset. That
 * list is first party, it shows the real sessions rather than asking the
 * reader to take this email's word for anything, and it is where a person who
 * does recognise the device has nothing to do and a person who does not can
 * remove it. The reset is named in the copy for the case that needs it.
 */
export function newDeviceSignIn(data: NewDeviceSignInData): EmailMessage {
  return message(
    "A new sign-in to your Vallo account",
    "A device that has not signed in before just did.",
    [
      heading("A new sign-in"),
      paragraph(
        `${hello(data.name)} Somebody signed in to your Vallo account from a device it has not seen before.`,
      ),
      rows(securityRows(data)),
      paragraph("If that was you, there is nothing to do and you can ignore this message."),
      paragraph(
        "If it was not you, set a new password first, then remove the device from your account.",
      ),
      button("Review your devices", appUrl("/settings/devices"), true),
      note(
        "Vallo will never ask you for your password or a sign-in code, by phone, by message or by email.",
      ),
    ],
    [
      "You are receiving this because a device signed in to this account for the first time.",
      "This is a security notice. It is always sent and it cannot be switched off.",
    ],
  );
}

/* -------------------------------------------------------------- inspections */

export type InspectionScheduledData = {
  /** Whether this is the person inspecting or the person showing. */
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
 * The inspection is booked.
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
    list.push({ label: viewing ? "Showing you round" : "Coming to inspect", value: other });
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
          ? `${hello(data.name)} Your inspection is confirmed. Here is where to be and when.`
          : `${hello(data.name)} Somebody is coming to inspect your property. Here are the details.`,
      ),
      rows(list),
      paragraph(
        viewing
          ? "Take your time and ask about the things a photograph cannot show you: the light, the water, the road in the rain, and what the service charge actually covers."
          : "The questions people ask most are about light, water, the gate and what the service charge covers. Having the answers ready is what turns an inspection into a tenancy.",
      ),
      bullets(
        viewing
          ? [
              "Go in daylight where you can.",
              "Tell somebody where you are going and when you expect to be back.",
              "Do not carry money to an inspection and do not pay anything at the gate.",
              "Keep the conversation in Vallo, so there is a record of what was agreed.",
            ]
          : [
              "Confirm the time in Vallo so the record shows what was agreed.",
              "Never ask the person inspecting for money at the property. Payment goes through Vallo.",
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
  /** The `VL-` code, once the listing is published. */
  reference?: string | null;
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
        /* THE CODE, IN THE PANEL BESIDE THE TITLE. This email is the one
           artefact a lister keeps, so it is where the nine characters they
           will later read down the phone belong. Omitted rather than left
           blank when there is none, which on this message should never
           happen: a code exists from the moment a listing is published. */
        ...(data.reference ? [{ label: "Listing ID", value: data.reference, strong: true }] : []),
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

export type ListingPassedReviewData = {
  listerName?: string | null;
  listingTitle: string;
};

/**
 * To the lister when a listing passes the checklist and is NOT yet live.
 *
 * WHY THIS IS A SECOND BUILDER AND NOT A REUSE OF `listingApproved`.
 *
 * Approve and publish are two separate acts on this platform, deliberately:
 * approve says the submission passes the admission checklist, publish is the
 * separate act that puts it into public search. `listingApproved`'s copy is
 * written for the second of those ("It is published and people can find it
 * now"), so sending it on the first would tell a lister their property is in
 * search when it is not.
 *
 * AND IT DOES NOT ASK THEM TO DO ANYTHING, which is the defect this fixes.
 * The in-app notification said "Publish it to put it in front of guests", an
 * action only an admin has. Somebody read that, went looking for a Publish
 * button on their own console, and found none. The truthful sentence is that
 * the next step is ours.
 */
export function listingPassedReview(data: ListingPassedReviewData): EmailMessage {
  return message(
    `Your listing passed review: ${data.listingTitle}`,
    "It passed the checks. We put it live next, and there is nothing for you to do.",
    [
      heading("Your listing passed review"),
      paragraph(
        `${hello(data.listerName)} A person has been through this listing against our admission checklist and it passed.`,
      ),
      rows([
        { label: "Listing", value: data.listingTitle },
        { label: "Status", value: "Passed review", strong: true },
      ]),
      paragraph(
        "Going live is a second step and it is ours, not yours. We do it once the listing has passed, and you get another message the moment it is in search along with the listing ID people can use to find it.",
      ),
      button("See your listings", appUrl("/agent/listings")),
      note("Nothing is required from you. If anything needs changing we will say exactly what."),
    ],
    [
      "You are receiving this because you submitted a listing on Vallo.",
      LISTER_SAFETY_LINE,
    ],
  );
}

export type ListingChangesRequestedData = {
  listerName?: string | null;
  listingTitle: string;
  /** The reviewer's own words. Always sent, never summarised away. */
  reason: string;
};

/**
 * To the lister when a reviewer wants something changed before it can go live.
 *
 * Separate from `listingRejected` because the two are different facts and the
 * subject line has to say which. A rejection is a decision; this is a pause,
 * and the listing goes straight back into the lister's hands in the state they
 * left it. Telling somebody their listing "was not published" when the
 * reviewer merely wants a clearer photograph costs this platform a lister for
 * no reason.
 *
 * The reason is REQUIRED and printed verbatim, for the same reason it is on
 * the rejection: an instruction nobody can act on is worse than silence,
 * because it cannot even be argued with.
 */
export function listingChangesRequested(data: ListingChangesRequestedData): EmailMessage {
  return message(
    `One change needed: ${data.listingTitle}`,
    "The reviewer asked for one thing. Here it is, in their words.",
    [
      heading("One change before this can go live"),
      paragraph(
        `${hello(data.listerName)} A person reviewed this listing and asked for a change before it is published. This is what they said.`,
      ),
      rows([
        { label: "Listing", value: data.listingTitle },
        { label: "What to change", value: data.reason, strong: true },
      ]),
      paragraph(
        "The listing is back in your hands and editable now. Make the change and send it again; it goes into the same queue and is usually answered within a day.",
      ),
      button("Edit your listing", appUrl("/agent/listings")),
      note("Nothing has happened to your account, and your other listings are unaffected."),
    ],
    ["You are receiving this because you submitted a listing on Vallo."],
  );
}

/* ------------------------------------------------------ agent registration */

export type AgentApplicationData = {
  name?: string | null;
  /** The VL-AGT reference support asks for. */
  reference: string;
};

/**
 * To an applicant when their agent registration is accepted.
 *
 * THE ONE WORD THIS MESSAGE MAY NOT USE IS "VERIFIED", and the in-app
 * notification already learnt that lesson: at this instant the ladder is at
 * tier 0 and the verification queue has not seen a document. Being admitted as
 * a lister and having been checked as a person are two different facts, and
 * first-party trust is sacred (BUILD 07 rule 12).
 */
export function agentApplicationApproved(data: AgentApplicationData): EmailMessage {
  return message(
    "Your Vallo agent application is approved",
    "Your agent workspace is open. Verification is a separate step.",
    [
      heading("You can start listing"),
      paragraph(
        `${hello(data.name)} Your application has been accepted, so your agent workspace is open and you can put up your first property.`,
      ),
      rows([
        { label: "Reference", value: data.reference },
        { label: "Status", value: "Approved", strong: true },
      ]),
      paragraph(
        "Verification is a separate step and it is worth doing early. It is what puts the checked badge on your listings, and people choose a checked lister over an unchecked one.",
      ),
      button("List your first property", appUrl("/agent/list")),
      note("Keep your reference. It is the one string support will ask you for."),
    ],
    [
      "You are receiving this because you applied to list on Vallo.",
      LISTER_SAFETY_LINE,
    ],
  );
}

export type AgentApplicationRefusedData = AgentApplicationData & {
  /** The reviewer's own words. */
  reason: string;
};

/** To an applicant when their agent registration is refused. */
export function agentApplicationRejected(data: AgentApplicationRefusedData): EmailMessage {
  return message(
    "Your Vallo agent application was not approved",
    "Here is what the reviewer said.",
    [
      heading("Your application was not approved"),
      paragraph(
        `${hello(data.name)} A person reviewed your application and it was not accepted. This is what they said.`,
      ),
      rows([
        { label: "Reference", value: data.reference },
        { label: "Reason", value: data.reason, strong: true },
      ]),
      paragraph(
        "If you think this is wrong, contact support with your reference and a person will look at it again. Your account is unaffected and you can carry on using Vallo to search, message and book.",
      ),
      button("Contact support", appUrl("/support")),
    ],
    ["You are receiving this because you applied to list on Vallo."],
  );
}

/** To an applicant when the reviewer needs something more before deciding. */
export function agentApplicationNeedsMore(data: AgentApplicationRefusedData): EmailMessage {
  return message(
    "One more thing on your Vallo agent application",
    "The reviewer needs something before they can decide.",
    [
      heading("One more thing before we can decide"),
      paragraph(
        `${hello(data.name)} Your application is with a reviewer and they need something more from you before they can decide. This is what they asked for.`,
      ),
      rows([
        { label: "Reference", value: data.reference },
        { label: "What is needed", value: data.reason, strong: true },
      ]),
      paragraph(
        "Open your application, add it, and send it back. It returns to the same queue and is usually answered within two working days.",
      ),
      button("Open your application", appUrl("/profile/application")),
      note("Nothing has been decided. Your application is held, not refused."),
    ],
    ["You are receiving this because you applied to list on Vallo."],
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
        "Reply inside Vallo. Enquiries that are answered the same day turn into inspections far more often than ones answered the next week, and the conversation on the platform is the record that protects you both.",
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
  /** What is going back to the card or account they paid with, in kobo. */
  refundMinor: number;
  /** What the host keeps, in kobo. Always paidMinor minus refundMinor. */
  retainedMinor: number;
  /** One plain sentence naming why this amount and not another. */
  reasonLine: string;
  /** The refund's reference, when any money is going back. */
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
    { label: "Going back to your card", value: money(data.refundMinor), strong: true },
  ];
  if (data.retainedMinor > 0) {
    list.push({ label: "Kept by the host", value: money(data.retainedMinor) });
  }

  return message(
    returned
      ? `${money(data.refundMinor)} is on its way back to your card`
      : `Cancelled: ${data.listingTitle}`,
    returned
      ? `Your stay is cancelled and ${money(data.refundMinor)} is being returned to the card you paid with.`
      : "Your stay is cancelled. Here is exactly how the amount was worked out.",
    [
      heading(returned ? "Your refund is on its way" : "Your stay is cancelled"),
      paragraph(
        `${hello(data.guestName)} A person at Vallo has cancelled this stay and released the dates.`,
      ),
      paragraph(data.reasonLine),
      rows(list),
      returned
        ? paragraph(REFUND_ROUTE)
        : paragraph(
            "Nothing has been taken from you beyond what you had already paid for this stay, and the booking stays in your history for your records.",
          ),
      data.reference ? code(data.reference) : null,
      button(
        returned ? "Open your bookings" : "Find another place",
        appUrl(returned ? "/bookings" : "/search"),
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

