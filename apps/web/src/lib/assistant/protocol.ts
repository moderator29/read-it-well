/**
 * Wire protocol between /api/assistant and the assistant UI.
 *
 * The route streams Server-Sent Events; each `data:` line carries one of these
 * JSON events. Shared by the route handler (server) and the chat surface
 * (client), so the two ends can never drift apart. Deliberately free of any
 * server-only import.
 */

export type AssistantListingItem = {
  id: string;
  title: string;
  city: string;
  kind: string;
  /** Display string, e.g. "NGN 185,000 / night". Formatted server-side. */
  price: string;
  rating: number;
  /** In-app link, always "/listing/<id>". */
  href: string;
  /** Lead photo URL for the card thumbnail. Not sent to the model. */
  photo?: string;
};

export type AssistantStreamEvent =
  | { type: "text"; text: string }
  | { type: "listings"; items: AssistantListingItem[] }
  | { type: "thread"; id: string }
  | { type: "done" };

/** 200 JSON body returned instead of a stream when the assistant cannot run. */
export type AssistantUnconfiguredBody = {
  configured: false;
  message: string;
};
