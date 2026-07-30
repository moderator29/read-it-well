import "server-only";

import { formatMoney } from "@naijafinds/i18n";
import { getMyBookings, type BookingGroups, type BookingView } from "../bookings/queries";
import { readStatement } from "../wallet/repository";
import { resolveSession, type SessionState } from "../actions/session";
import { faqAnswerById, searchFaq } from "./faq";
import { fileSupportTicket } from "./actions";
import type { SupportAction } from "./types";

/**
 * The support agent's tools, and the only facts it is allowed to state.
 *
 * Authorisation model, in one sentence: every personal tool runs on the
 * caller's own Row Level Security client, resolved once per request from their
 * auth cookies, and never on the service role. `resolveSession()` hands back
 * that client already bound to the signed-in user, and each read is filtered
 * by the caller's own id on top of RLS, so a tool physically cannot return
 * another person's booking, wallet or ticket. A signed-out caller has no such
 * client, so the personal tools answer "unavailable, offer sign-in" rather
 * than guessing, and the model is told to say exactly that.
 *
 * The one service-role touch in the whole feature is the anonymous ticket
 * insert inside `fileSupportTicket`, which is a write of the name and email
 * the person just gave, never a read, and it long predates the agent.
 */

/* ------------------------------------------------------------------ shapes */

/** Whatever a tool returns is JSON encoded straight into the tool result. */
export type ToolOutcome = {
  /** What the model sees. */
  result: unknown;
  /** Quick actions the surface should offer, because the route exists. */
  actions?: SupportAction[];
  /** Set when a ticket was really written, so the UI can show the receipt. */
  reference?: string;
};

const SIGN_IN_ACTION: SupportAction = {
  kind: "sign-in",
  label: "Sign in",
  href: "/sign-in",
};

const BOOKINGS_ACTION: SupportAction = {
  kind: "bookings",
  label: "Open my bookings",
  href: "/bookings",
};

const WALLET_ACTION: SupportAction = {
  kind: "wallet",
  label: "Open my wallet",
  href: "/wallet",
};

const MESSAGES_ACTION: SupportAction = {
  kind: "messages",
  label: "Message the agent",
  href: "/messages",
};

const SIGNED_OUT = {
  available: false,
  reason:
    "This person is not signed in, so their own records cannot be read. Say so plainly and offer sign in. Never guess what their booking or balance might be.",
} as const;

/* ------------------------------------------------------------ declarations */

/**
 * The tool set, deliberately small. Four reads and one write: anything wider
 * would be a way for the model to wander off the caller's own record.
 */
export const SUPPORT_TOOLS = [
  {
    name: "search_help",
    description:
      "Search RentMe's canonical help notes: how bookings, payments, the wallet, listing a property, verification, cancellations, languages, privacy and messaging safety actually work. Call this before answering any question about policy or how the platform works, and answer from what it returns rather than from memory.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The person's question, in their own words.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "my_bookings",
    description:
      "Read the signed-in caller's own bookings: status, dates, listing title and total. Use it whenever they ask about their trip, their dates or their booking. Returns unavailable when nobody is signed in.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "my_wallet",
    description:
      "Read the signed-in caller's own wallet: the derived naira balance and their last few ledger entries. Use it for questions about balance, a refund landing, a withdrawal or a transaction. Returns unavailable when nobody is signed in.",
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "booking_policy",
    description:
      "For one of the caller's own bookings, say whether it can still be cancelled and what cancelling does. Pass the booking id returned by my_bookings. Returns unavailable when nobody is signed in, and not found when the booking is not theirs.",
    input_schema: {
      type: "object",
      properties: {
        bookingId: {
          type: "string",
          description: "The booking id from my_bookings.",
        },
      },
      required: ["bookingId"],
      additionalProperties: false,
    },
  },
  {
    name: "file_ticket",
    description:
      "Hand the matter to the human support team by filing a real support ticket, and return its NF-SUP reference. Call this when the person asks for a human, or when the matter is money lost, safety, fraud, or an account they cannot get into, or when you genuinely cannot answer. For a signed-out caller you must have their name and email first: ask for both in the conversation, or point them at the Talk to a person control. Never say a ticket exists unless this tool returned a reference.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "A short subject line, e.g. Refund not received.",
        },
        question: {
          type: "string",
          description: "What the person asked, in their own words.",
        },
        summary: {
          type: "string",
          description:
            "Three or four sentences for the human picking this up: what they want, what you already checked, and what is still open. No speculation.",
        },
        name: {
          type: "string",
          description: "Their name. Required when nobody is signed in.",
        },
        email: {
          type: "string",
          description: "Their email address. Required when nobody is signed in.",
        },
      },
      required: ["topic", "question", "summary"],
      additionalProperties: false,
    },
  },
] as const;

/* ----------------------------------------------------------------- helpers */

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Flatten the grouped trips read into one list the model can reason over. */
function flatten(groups: BookingGroups): { group: string; booking: BookingView }[] {
  return [
    ...groups.upcoming.map((booking) => ({ group: "upcoming", booking })),
    ...groups.completed.map((booking) => ({ group: "completed", booking })),
    ...groups.cancelled.map((booking) => ({ group: "cancelled", booking })),
  ];
}

function bookingForModel(group: string, booking: BookingView) {
  return {
    id: booking.id,
    title: booking.title,
    city: booking.city,
    status: booking.status,
    group,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    dates: booking.dateRange,
    nights: booking.nights,
    guests: booking.guests,
    total: booking.totalDisplay,
    cancellable: booking.cancellable,
  };
}

/* ------------------------------------------------------------------- tools */

/** Canonical policy answers. No personal data, so no session needed. */
function runSearchHelp(input: unknown): ToolOutcome {
  const query = asString(asRecord(input).query);
  const entries = query ? searchFaq(query, 3) : [];
  if (entries.length === 0) {
    return {
      result: {
        matches: [],
        note: "Nothing in the help notes covers this. Do not invent an answer: say plainly that you do not know and offer to hand it to a person.",
      },
    };
  }
  return {
    result: {
      matches: entries.map((entry) => ({ topic: entry.id, answer: entry.answer })),
    },
  };
}

/**
 * The caller's own trips, read as them.
 *
 * `getMyBookings` is the same read the trips hub uses: it resolves the session
 * from the request's own cookies and selects with `guest_id` pinned to that
 * user under RLS. We check the resolved session first so a signed-out caller
 * never reaches the query at all.
 */
async function runMyBookings(session: SessionState): Promise<ToolOutcome> {
  if (session.state !== "signed-in") {
    return { result: SIGNED_OUT, actions: [SIGN_IN_ACTION] };
  }
  const groups = await getMyBookings("en");
  if (!groups) return { result: SIGNED_OUT, actions: [SIGN_IN_ACTION] };

  const rows = flatten(groups);
  if (rows.length === 0) {
    return {
      result: { bookings: [], note: "This person has no bookings on their account yet." },
      actions: [BOOKINGS_ACTION],
    };
  }
  return {
    result: { bookings: rows.slice(0, 20).map((row) => bookingForModel(row.group, row.booking)) },
    actions: [BOOKINGS_ACTION, MESSAGES_ACTION],
  };
}

/** The caller's own balance and last few entries, read as them. */
async function runMyWallet(session: SessionState): Promise<ToolOutcome> {
  if (session.state !== "signed-in") {
    return { result: SIGNED_OUT, actions: [SIGN_IN_ACTION] };
  }
  try {
    const statement = await readStatement(session.supabase, session.user.id);
    return {
      result: {
        balance: formatMoney(statement.balanceMinor, "en", statement.currency),
        note: "The balance is derived from the full ledger, never stored.",
        recent: statement.entries.slice(0, 5).map((entry) => ({
          kind: entry.kind,
          direction: entry.direction,
          amount: formatMoney(entry.amountMinor, "en", statement.currency),
          status: entry.status,
          reference: entry.reference,
          when: entry.createdAt,
          ...(entry.note ? { note: entry.note } : {}),
        })),
      },
      actions: [WALLET_ACTION],
    };
  } catch {
    return {
      result: {
        available: false,
        reason:
          "The wallet could not be read just now. Say so honestly and offer to hand this to a person; do not state a balance.",
      },
    };
  }
}

/** Whether one of the caller's own bookings can still be called off. */
async function runBookingPolicy(session: SessionState, input: unknown): Promise<ToolOutcome> {
  if (session.state !== "signed-in") {
    return { result: SIGNED_OUT, actions: [SIGN_IN_ACTION] };
  }
  const bookingId = asString(asRecord(input).bookingId);
  const groups = await getMyBookings("en");
  const match = groups ? flatten(groups).find((row) => row.booking.id === bookingId) : undefined;

  if (!match) {
    return {
      result: {
        found: false,
        note: "No booking with that id belongs to this person. Ask them to confirm which trip they mean; never describe a booking you have not read.",
      },
      actions: [BOOKINGS_ACTION],
    };
  }

  const { booking, group } = match;
  const policy = faqAnswerById("cancellations");
  return {
    result: {
      booking: bookingForModel(group, booking),
      cancellable: booking.cancellable,
      whatCancellingDoes: booking.cancellable
        ? "Cancelling releases the dates and moves this booking to cancelled straight away. The agent is told. Money already paid follows the cancellation policy below, and returns to the RentMe wallet rather than to a card."
        : booking.status === "CANCELLED"
          ? "This booking is already cancelled, so there is nothing left to call off."
          : "This booking can no longer be cancelled from the app, because it has started or is already past. A person on the support team has to look at it.",
      policy:
        policy ??
        "Cancellation terms are set by each listing. Do not state terms you have not read here.",
      where: "Bookings, then the trip, then Cancel booking.",
    },
    actions: [BOOKINGS_ACTION],
  };
}

/**
 * The escalation. A ticket only counts when the row was written, so the model
 * is handed the reference the database gave back and nothing else.
 */
async function runFileTicket(session: SessionState, input: unknown): Promise<ToolOutcome> {
  const raw = asRecord(input);
  const topic = asString(raw.topic).slice(0, 140) || "Support chat escalation";
  const question = asString(raw.question);
  const summary = asString(raw.summary);

  const signedIn = session.state === "signed-in";
  const accountEmail = signedIn ? (session.user.email ?? "") : "";
  const metadata = signedIn ? asRecord(session.user.user_metadata) : {};
  const accountName = signedIn
    ? asString(metadata.full_name) || asString(metadata.name) || "RentMe member"
    : "";

  const name = asString(raw.name) || accountName;
  const email = asString(raw.email) || accountEmail;

  if (!name || !email) {
    return {
      result: {
        filed: false,
        need: ["name", "email"],
        note: "No ticket was created. Ask for a name and an email address, and tell them that is all support keeps. They can also use the Talk to a person control on this screen.",
      },
    };
  }

  const outcome = await fileSupportTicket({
    name,
    email,
    topic,
    body: question || summary || "Escalated from the support chat.",
    summary: summary
      ? `Support agent summary: ${summary}`
      : "Escalated from the support chat with no summary.",
  });

  if (!outcome.ok) {
    return {
      result: {
        filed: false,
        reason: outcome.error,
        note: "No ticket exists. Repeat the reason above in your own words and do not invent a reference.",
      },
    };
  }

  return {
    result: {
      filed: true,
      reference: outcome.data.reference,
      note: "The ticket row is written. Give them this reference exactly and say a person replies by email.",
    },
    reference: outcome.data.reference,
  };
}

/* ------------------------------------------------------------- the switch */

/**
 * Run one tool call. `session` is resolved once per request and shared, so
 * every tool in a turn acts as the same caller and no tool can widen its own
 * authority mid-conversation.
 */
export async function runSupportTool(
  name: string,
  input: unknown,
  session: SessionState,
): Promise<ToolOutcome> {
  switch (name) {
    case "search_help":
      return runSearchHelp(input);
    case "my_bookings":
      return runMyBookings(session);
    case "my_wallet":
      return runMyWallet(session);
    case "booking_policy":
      return runBookingPolicy(session, input);
    case "file_ticket":
      return runFileTicket(session, input);
    default:
      return { result: { error: `No tool named ${name}.` } };
  }
}

/** One auth round trip per request, shared by the throttle and every tool. */
export async function resolveSupportCaller(): Promise<SessionState> {
  try {
    return await resolveSession();
  } catch {
    // An auth read that cannot run means the caller is treated as signed out:
    // they still get help, and no personal tool will answer.
    return { state: "signed-out" };
  }
}
