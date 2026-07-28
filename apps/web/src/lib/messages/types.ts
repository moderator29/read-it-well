/** Domain types for guest to agent messaging. Shared by every data source. */

export type MessageAuthor = "guest" | "agent";

export type ChatMessage = {
  id: string;
  author: MessageAuthor;
  /** Message text. May be empty when the message is image-only. */
  body: string;
  /** Image attached to the message, when present. */
  image?: { src: string; alt: string };
  /**
   * Local wall-clock timestamp, `YYYY-MM-DDTHH:MM`. Kept as a plain string so
   * server and client render the identical label without timezone drift.
   */
  sentAt: string;
};

export type ConversationSummary = {
  id: string;
  agentName: string;
  listingTitle: string;
  lastMessage: string;
  /** Same format as `ChatMessage.sentAt`. */
  lastMessageAt: string;
  /** True when the latest agent message has not been opened yet. */
  unread: boolean;
};

export type ConversationListing = {
  id: string;
  slug: string;
  title: string;
  /** Display locality, e.g. "Lekki Phase 1". */
  area: string;
  city: string;
  /** The listing passed platform review and is published. */
  approved: boolean;
  /** The listing carries the verified badge. */
  verified: boolean;
  /** Deterministic hue index for the placeholder tile, 0 to 5. */
  hue: number;
};

export type ConversationThread = {
  id: string;
  agentName: string;
  listing: ConversationListing;
  messages: ChatMessage[];
};

export interface MessageRepository {
  /** True when results come from local seed content rather than the platform. */
  readonly isSeed: boolean;
  conversations(): Promise<ConversationSummary[]>;
  conversation(id: string): Promise<ConversationThread | null>;
  /**
   * The guest's conversation about a listing, if one exists. Lets the listing
   * page deep link "Message agent" straight into the thread.
   */
  conversationIdForListing(listingId: string): Promise<string | null>;
}
