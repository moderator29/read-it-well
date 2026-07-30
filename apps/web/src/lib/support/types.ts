/**
 * Support wire types.
 *
 * Shared between the /api/support route handler and the support surface, so
 * both sides of the stream agree on every event shape. Client-safe: nothing
 * in here touches the server.
 *
 * The route speaks Server-Sent Events, one JSON object per `data:` line:
 *   text     an incremental slice of the agent's reply
 *   actions  quick actions the person can take, because a real surface exists
 *   ticket   the real NF-SUP reference of a ticket the agent just filed
 *   error    a friendly, already-worded failure the UI can show verbatim
 *   done     the turn is complete
 */

/** Chat turns the client sends up; plain text both ways. */
export type SupportTurn = { role: "user" | "assistant"; content: string };

/** The surfaces support can hand somebody straight to. */
export type SupportActionKind = "bookings" | "wallet" | "messages" | "sign-in";

export type SupportAction = {
  kind: SupportActionKind;
  /** Ready-to-render label, e.g. "Open my bookings". */
  label: string;
  /** In-app link, always a real route. */
  href: string;
};

export type SupportStreamEvent =
  | { type: "text"; text: string }
  | { type: "actions"; items: SupportAction[] }
  | { type: "ticket"; reference: string }
  | { type: "error"; message: string }
  | { type: "done" };

/** The 200 JSON body returned when the agent cannot run yet. */
export type SupportUnconfigured = { configured: false; message: string };
