import "server-only";
import type {
  ConversationSummary,
  ConversationThread,
  MessageRepository,
} from "./types";

/**
 * Messaging data access.
 *
 * Same contract as the listing and agent repositories: the platform messaging
 * API does not exist yet, so the surface reads through this interface from day
 * one and swapping in the real backend is a one line change here (Master Rules
 * 8 and 66).
 *
 * Selected by NF_DATA_SOURCE:
 *   "seed" (default) one local conversation with the approved seed agent
 *   "api"            the real platform API, which is not built yet
 */

/**
 * One conversation with the agent of the approved, verified seed listing
 * (`seed-1`, the same record the listing repository serves). The agent opens
 * the thread; nothing here fakes a live exchange.
 */
const SEED_THREADS: ConversationThread[] = [
  {
    id: "conv-1",
    agentName: "Adaeze Okafor",
    listing: {
      id: "seed-1",
      slug: "oceanview-3br-apartment-lekki",
      title: "Oceanview 3BR Apartment",
      area: "Lekki Phase 1",
      city: "Lagos",
      approved: true,
      verified: true,
      hue: 0,
    },
    messages: [
      {
        id: "conv-1-m1",
        author: "agent",
        body:
          "Good morning! Thanks for your interest in the Oceanview 3BR Apartment in Lekki Phase 1. I would be glad to arrange a viewing whenever suits you, and you can ask me anything about the place here.",
        sentAt: "2026-07-28T09:14",
      },
    ],
  },
];

function toSummary(thread: ConversationThread): ConversationSummary {
  const last = thread.messages[thread.messages.length - 1];
  return {
    id: thread.id,
    agentName: thread.agentName,
    listingTitle: thread.listing.title,
    lastMessage: last ? last.body : "",
    lastMessageAt: last ? last.sentAt : "",
    unread: last ? last.author === "agent" : false,
  };
}

class SeedMessageRepository implements MessageRepository {
  readonly isSeed = true;
  async conversations(): Promise<ConversationSummary[]> {
    return SEED_THREADS.map(toSummary);
  }
  async conversation(id: string): Promise<ConversationThread | null> {
    return SEED_THREADS.find((t) => t.id === id) ?? null;
  }
}

class ApiMessageRepository implements MessageRepository {
  readonly isSeed = false;
  async conversations(): Promise<ConversationSummary[]> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the messaging API is not implemented yet. " +
        "Unset it to fall back to seed content.",
    );
  }
  async conversation(): Promise<ConversationThread | null> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the messaging API is not implemented yet. " +
        "Unset it to fall back to seed content.",
    );
  }
}

export function getMessageRepository(): MessageRepository {
  return process.env.NF_DATA_SOURCE === "api"
    ? new ApiMessageRepository()
    : new SeedMessageRepository();
}
