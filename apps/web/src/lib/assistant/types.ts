/**
 * Assistant wire types.
 *
 * Shared between the /api/assistant route handler and the chat surface, so
 * both sides of the stream agree on every event shape. Client-safe: nothing
 * in here touches the server.
 *
 * The route speaks Server-Sent Events, one JSON object per `data:` line:
 *   text      an incremental slice of the assistant's reply
 *   listings  real catalogue results to render as tappable cards
 *   thread    the server conversation id, once persistence is in play
 *   error     a friendly, already-worded failure the UI can show verbatim
 *   done      the turn is complete
 */

export type AssistantListingItem = {
  id: string;
  title: string;
  city: string;
  kind: string;
  /** Already-formatted display price, e.g. "NGN 185,000 per night". */
  price: string;
  rating: number;
  /** In-app link, always "/listing/<id>". */
  href: string;
  /** Lead photo URL for the card thumbnail. */
  photo?: string;
};

export type AssistantStreamEvent =
  | { type: "text"; text: string }
  | { type: "listings"; items: AssistantListingItem[] }
  | { type: "thread"; id: string }
  | { type: "error"; message: string }
  | { type: "done" };

/** Chat turns the client sends up; plain text both ways. */
export type AssistantTurn = { role: "user" | "assistant"; content: string };

/** The 200 JSON body returned when the assistant cannot run yet. */
export type AssistantUnconfigured = { configured: false; message: string };
