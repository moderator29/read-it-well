import type { MovementKind, MovementStatus, OnboardingState, ProfileGap } from "./funds";

/**
 * WHAT A MEMBER READS ON THE WALLET SCREEN (founder sections 36 to 46;
 * 13-provider-must-not-leak). No provider name, no provider word and no
 * backend state appears here, with ONE deliberate exception (ADR 0003,
 * consequence 3): `HELD_BY`, the line that says who holds the money.
 *
 * Every waiting sentence says what is known and what is not, and none of
 * them pretends to progress (section 43: no fake progress, no timers).
 *
 * The founder, 7 October: "What is balance? Call it WALLET." Every word a
 * member reads says Wallet; the identifiers keep `balance` to avoid churn.
 */

export const BALANCE_TITLE = "Wallet";
export const BALANCE_LEDE = "Your wallet and every movement in it, in one place.";

/**
 * LEGAL REVIEW (founder section 61): names the provider and claims no
 * licence or regulatory status for it beyond what its documentation states.
 * Counsel to confirm the wording before launch.
 */
export const HELD_BY = "Your money is held by Payluk, our escrow partner, not by Vallo.";
export const HELD_BY_LINK = "How payments work";
export const HELD_BY_HREF = "/safety#how-payments";

export const FIGURE_LABEL = {
  available: "Available",
  protected: "Held for a deal",
  pending: "Pending",
  processing: "Processing",
} as const;

export const FIGURE_HINT = {
  available: "Ready to withdraw, send or pay with.",
  protected: "Committed to a deal and held until it completes.",
  pending: "Coming in, waiting for the bank to confirm.",
  processing: "On its way out, waiting for the bank to confirm.",
} as const;

export const ACTION_LABEL = { add: "Add money", withdraw: "Withdraw", send: "Send" } as const;

/** "Confirmed 2 minutes ago", from the time the provider last said so. */
export function confirmedAgo(iso: string | null, now: number): string {
  if (!iso) return "Nothing yet";
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "Confirmed just now";
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "Confirmed just now";
  /* The language inflects the unit, never a hand-written "s"
     (`no-english-plurals.test.ts`): "Confirmed 1 minute ago", "2 minutes ago". */
  const ago = new Intl.RelativeTimeFormat("en", { numeric: "always" });
  if (min < 60) return `Confirmed ${ago.format(-min, "minute")}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Confirmed ${ago.format(-h, "hour")}`;
  return `Confirmed ${ago.format(-Math.floor(h / 24), "day")}`;
}

export const STALE_NOTE = "These are the last figures we confirmed. Money moves again once we reconnect.";

/* ------------------------------------------------------- not connected
   The founder, 7 October: draw the real wallet now, even before the key is
   connected, and say why it waits in ONE short line. Nothing is drawn in the
   figure's place that reads as an amount (any figure would be invented, a
   zero included), and no paragraph about partners or rails. */

export const NOT_CONNECTED_FIGURE = "Not connected yet";
export const NOT_CONNECTED_LINE = "Opens when your wallet is connected";

/** Connected, but the figures could not be read just now. */
export const UNREACHABLE_FIGURE = "Not available right now";
export const UNREACHABLE_LINE = "We could not reach your wallet. Nothing has moved.";

export const ACTIVITY_EMPTY = { title: "No activity yet", body: "Money you add, withdraw or transfer shows here." } as const;

/* The founder's ruling, 7 October: the wallet is where all money lives, so
   the records the side nav used to list sit on the wallet as one group. */
export const WALLET_RECORDS_LABEL = "Your money";
export const WALLET_RECORDS = [
  { href: "/payments", title: "Payments", icon: "credit-card" },
  { href: "/receipts", title: "Receipts", icon: "receipt" },
  { href: "/payouts", title: "Payouts", icon: "bank" },
  { href: "/refunds", title: "Refunds", icon: "hand-coins" },
] as const;

/* ---------------------------------------------------------- onboarding */

export const ONBOARDING_COPY: Record<OnboardingState, { title: string; body: string }> = {
  NOT_STARTED: {
    title: "Open your wallet",
    body: "Your money is held by our escrow partner, never by Vallo. To open your wallet we share your name, email and phone with them, so they can keep your money under your name. Nothing else is shared and nothing is charged.",
  },
  PENDING: {
    title: "Setting up your wallet",
    body: "We have asked our partner to open your wallet and are waiting for their answer. This page updates on its own. You do not need to do anything.",
  },
  VERIFICATION_REQUIRED: {
    title: "A few details first",
    body: "Your wallet is opened in your own name, so we need these on your profile before we ask our partner to open it.",
  },
  ACTIVE: { title: "Your wallet is open", body: "You can add money, withdraw and transfer." },
  RESTRICTED: {
    title: "Some actions are paused",
    body: "Our partner has limited what this wallet can do for now. Nothing has moved, and nothing will until this is sorted. Contact support and we will find out why.",
  },
  SUSPENDED: {
    title: "Your wallet is on hold",
    body: "Our partner has put this wallet on hold. Your money stays where it is and nothing can move until the hold is lifted. Contact support and we will help.",
  },
  FAILED: {
    title: "We could not open your wallet",
    body: "Our partner did not accept the details we sent. Check your name, email and phone on your profile, then try again.",
  },
};

export const GAP_LABEL: Record<ProfileGap, string> = {
  first_name: "Your first name",
  last_name: "Your surname",
  phone: "A Nigerian mobile number",
  email: "Your email address",
};

export const OPEN_ACTION = "Open my wallet";

/* ----------------------------------------------------------- movements */

const KIND_TITLE: Record<MovementKind, string> = {
  deposit: "Money added",
  withdrawal: "Withdrawal",
  transfer_out: "Money sent",
  transfer_in: "Money received",
  other: "Movement",
};

export function movementTitle(kind: MovementKind): string {
  return KIND_TITLE[kind];
}

/** The status a member reads, by kind, because "processing" means a different wait for each. */
export function movementStatusLabel(kind: MovementKind, status: MovementStatus): string {
  switch (status) {
    case "preparing":
      return "Getting ready";
    case "awaiting_confirmation":
      return "Waiting for you to confirm";
    case "awaiting_payment":
      return "Waiting for your payment";
    case "processing":
      return kind === "withdrawal" ? "On its way to your bank" : kind === "deposit" ? "Waiting for your bank" : "Sending";
    case "unknown":
      return "Checking";
    case "completed":
      return kind === "deposit" ? "Added" : kind === "transfer_in" ? "Received" : "Completed";
    case "failed":
      return "Not completed";
    case "reversed":
      return "Returned";
    case "cancelled":
      return "Cancelled";
    case "under_review":
      return "Under review";
  }
}

export type StatusTone = "neutral" | "waiting" | "done" | "problem";
export function movementTone(status: MovementStatus): StatusTone {
  if (status === "completed") return "done";
  if (status === "failed" || status === "reversed") return "problem";
  if (status === "cancelled") return "neutral";
  return "waiting";
}

/* ----------------------------------------------------- the waiting room */

/** What the screen says while a movement is open. Calm, true, and never a countdown. */
export const WAITING_COPY: Record<"withdrawal" | "deposit" | "send" | "unknown" | "review", { title: string; body: string }> = {
  withdrawal: {
    title: "On its way to your bank",
    body: "Bank transfers usually land within a few minutes and can take longer at busy times. You can leave this screen: we keep checking and this updates the moment your bank confirms. You will not be charged twice.",
  },
  deposit: {
    title: "Waiting for your bank to confirm",
    body: "Once your bank confirms the payment it shows as Available. That is usually a few minutes. You can leave this screen; it updates on its own.",
  },
  send: {
    title: "Sending",
    body: "Sends between members usually settle within a minute. You can leave this screen; it updates on its own and you will not be charged twice.",
  },
  unknown: {
    title: "Checking what happened",
    body: "We asked for this and did not hear back in time. That does not mean it failed. Please do not try again: we are checking, and this updates on its own. Your wallet will not be charged twice.",
  },
  review: {
    title: "Under review",
    body: "What we heard back did not match what you asked for, so a person is checking it before anything is shown as done. Your money is not lost. We will tell you as soon as it is settled.",
  },
};

export const WAITING_STEPS = {
  withdrawal: ["Request received", "Sent to your bank", "Your bank confirms"],
  deposit: ["You pay", "Your bank confirms", "Added to Available"],
  send: ["Request received", "Sent", "Received"],
} as const;

/* ------------------------------------------------------------- refusals */

export const REFUSAL = {
  notLive: "Your wallet is not connected yet, so nothing was sent.",
  notActive: "Your wallet needs to be open before money can move.",
  amountInvalid: "Enter an amount in naira, like 25,000.",
  belowWithdrawalMinimum: "The smallest withdrawal is ₦1,000.",
  belowMinimum: "The smallest amount is ₦100.",
  aboveMaximum: "That is more than a single movement can carry. Split it into smaller amounts.",
  insufficient: "That is more than you have Available. Nothing has moved.",
  insufficientWithFee: "With the processing fee this comes to more than you have Available. Nothing has moved.",
  accountNotFound: "We could not find that account at that bank. Check the number and the bank, then try again.",
  accountUnreachable: "We could not reach the bank to check this account. Nothing has moved. Try again in a moment.",
  accountChanged: "The name on this account is not the one you were shown, so nothing was sent. Check the account and try again.",
  busy: "Lots of people are moving money right now. Nothing was sent. Try again in a minute.",
  unavailable: "We could not reach our partner just now. Nothing was sent. Try again shortly.",
  stagedUnknown: "We could not confirm this was set up, so nothing was sent. Please try again in a moment.",
  refused: "This could not be completed and nothing has moved. Check the details and try again, or contact support.",
  submittedUnknown: "We sent this and did not hear back in time. Do not try again: we are checking, and this page updates on its own.",
  otpNeeded: "Enter the code sent to your phone to finish.",
  alreadySent: "This was already sent. Showing where it is.",
  noRecipient: "No Vallo member can receive money at that number yet.",
  selfSend: "That is your own number.",
  recipientOnHold: "That member cannot receive money right now. Nothing was sent.",
  depositUnavailable: "Adding money is not available from here yet. Nothing was charged.",
  generic: "Something on our side stopped this, and nothing has moved. Try again shortly.",
  noAnswer: "We did not hear back. Check your connection and try again; anything already sent shows in your activity.",
} as const;
