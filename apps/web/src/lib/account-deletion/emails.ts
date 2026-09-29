import {
  appUrl,
  bullets,
  button,
  code,
  compose,
  heading,
  hello,
  note,
  paragraph,
  prettyDate,
} from "../email/render";
import { GRACE_WINDOW_DAYS } from "./constants";

/**
 * The two emails a deletion sends: one when it starts, one when it is done.
 *
 * PURE VALUES, NO NETWORK. Each function takes typed data and answers with a
 * subject and both renderings, so a test can read the words without a mail
 * provider. The sending lives in `purge.ts` and `actions.ts`, behind
 * `bestEffortEmail`, because a deletion that really happened must not be
 * reported as failed because Resend was slow.
 *
 * WHAT MAY NOT BE IN THEM. No name, no telephone number, no address, no
 * account number, no list of what somebody booked. Rule 16 applies to email
 * exactly as it applies to a log line: the reader already knows who they are,
 * and an inbox is not a private place. The greeting is the one exception and
 * it goes through `hello`, which is how every other message in this codebase
 * greets somebody and which cannot produce "Hello ,".
 *
 * THE SECOND EMAIL IS SENT TO AN ADDRESS THAT IS ABOUT TO STOP EXISTING, so
 * `purge.ts` reads it before the scrub and hands it here. It is used once and
 * never stored, never logged and never written to the audit line.
 */

export type DeletionEmail = { subject: string; preheader: string; html: string; text: string };

export type DeletionStartedData = {
  name?: string | null;
  /** ISO date the purge runs, already computed by the database. */
  purgeAfter: string;
  /** The code that cancels it. Shown once, stored only as a hash. */
  restoreCode: string;
};

/**
 * The first email. It has one job beyond confirming: make the way back
 * impossible to miss. The account is banned for the window, so the code IS the
 * way back, and it is given its own block rather than a sentence.
 */
export function deletionStarted(data: DeletionStartedData): DeletionEmail {
  // `prettyDate` takes YYYY-MM-DD and `purge_after` arrives as a full
  // timestamptz, so the date part is taken here. Without this the subject line
  // reads back a machine timestamp, which `emails.test.ts` caught.
  const when = prettyDate(data.purgeAfter.slice(0, 10));
  const composed = compose({
    preheader: "Nothing is destroyed yet. The restore code in this email stops it.",
    blocks: [
      heading("Your account is scheduled for deletion"),
      paragraph(
        `${hello(data.name)} We have received your request. Your account is now signed out everywhere and deactivated, and nothing has been destroyed yet.`,
      ),
      paragraph(
        `On ${when}, which is ${GRACE_WINDOW_DAYS} days from now, we will destroy your profile, your photographs, your posts, your saved items, your messages' attachments and every file you uploaded, including any host documents. If you were approved as an agent, your identification documents and details are kept for five years, as the money laundering rules require, and then destroyed.`,
      ),
      paragraph(
        "Records of money will be kept. Bookings, wallet entries, payments and payout records stay on file because Nigerian anti-money-laundering rules require them, and your name, email address and telephone number are removed from every one of them. Messages you sent stay in the other person's conversation with an anonymous sender, so their side of the thread still reads.",
      ),
      heading("If you change your mind"),
      paragraph(
        "You cannot sign in while the account is deactivated, so use this code instead. It stops the deletion and puts everything back.",
      ),
      code(data.restoreCode),
      button("Stop the deletion", appUrl("/delete-account")),
      note(
        "Keep this code. It is the only thing that can stop the deletion, and it can do nothing else.",
      ),
    ],
    footerLines: ["You are receiving this because a deletion was requested for this Vallo account."],
  });

  return {
    subject: `Your account will be deleted on ${when}`,
    preheader: composed.preheader,
    html: composed.html,
    text: composed.text,
  };
}

export type DeletionCompletedData = {
  name?: string | null;
};

/**
 * The second email, and the last one this address will ever receive from us.
 * It says what is gone, what is kept and why, and it does not invite a reply
 * to an account that no longer exists.
 */
export function deletionCompleted(data: DeletionCompletedData): DeletionEmail {
  const composed = compose({
    preheader: "This is the last email Vallo sends to this address.",
    blocks: [
      heading("Your account has been deleted"),
      paragraph(
        `${hello(data.name)} The deletion you asked for has run. This is the last email we will send to this address.`,
      ),
      heading("What was destroyed"),
      bullets([
        "Your profile, your photograph and your cover picture.",
        "Your posts, comments, stories and drafts.",
        "Your saved items, interests and saved searches.",
        "Every device you were signed in on, and every notification.",
        "Every file you uploaded, including host documents. An approved agent's identification is kept for five years, as the money laundering rules require, and then destroyed.",
      ]),
      heading("What was kept, and why"),
      paragraph(
        "Bookings, reservations, wallet entries, payments, payout records, inspection requests and reviews are kept because Nigerian anti-money-laundering rules require transaction records to be retained. Your name, email address and telephone number have been removed from all of them, and what is left is an amount, a date and a reference that no longer points at a person.",
      ),
      paragraph(
        "Messages you sent remain in the other person's conversation, with an anonymous sender, so their side of the thread is still readable.",
      ),
      note("You are welcome to make a new account at any time."),
    ],
    footerLines: ["You are receiving this because the Vallo account for this address has been deleted."],
  });

  return {
    subject: "Your Vallo account has been deleted",
    preheader: composed.preheader,
    html: composed.html,
    text: composed.text,
  };
}
