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
 *   "seed" (default) local conversations with agents of the published seed listings
 *   "api"            the real platform API, which is not built yet
 */

/**
 * Conversations with the agents of published seed listings, mirroring the
 * records the listing repository serves (`seed-1`, `seed-2`, `seed-7`). Each
 * thread reads like a real enquiry: availability, parking, inspection. The
 * newest thread sits first once summarised.
 */
const SEED_THREADS: ConversationThread[] = [
  {
    id: "conv-1",
    agentName: "Adaeze Okafor",
    listing: {
      id: "seed-1",
      slug: "eko-pearl-waterfront-apartment-victoria-island",
      title: "Eko Pearl Waterfront Apartment",
      area: "Victoria Island",
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
          "Good morning! Thanks for your interest in the Eko Pearl Waterfront Apartment in Victoria Island. I would be glad to arrange a viewing whenever suits you, and you can ask me anything about the place here.",
        sentAt: "2026-07-28T09:14",
      },
      {
        id: "conv-1-m2",
        author: "guest",
        body:
          "Good morning. Is the apartment free from this Friday for a week? And can guests use the pool?",
        sentAt: "2026-07-28T09:20",
      },
      {
        id: "conv-1-m3",
        author: "agent",
        body:
          "Yes, those dates are open. The pool is for residents and their guests, from 7am to 9pm every day.",
        sentAt: "2026-07-28T09:26",
      },
      {
        id: "conv-1-m4",
        author: "agent",
        body:
          "You are also welcome to inspect the apartment before anything else. I can meet you at the estate gate any afternoon this week.",
        sentAt: "2026-07-28T09:27",
      },
    ],
  },
  {
    id: "conv-2",
    agentName: "Chinedu Balogun",
    listing: {
      id: "seed-2",
      slug: "lekki-palm-grove-shortlet",
      title: "Lekki Palm Grove Shortlet",
      area: "Lekki Phase 1",
      city: "Lagos",
      approved: true,
      verified: true,
      hue: 1,
    },
    messages: [
      {
        id: "conv-2-m1",
        author: "guest",
        body:
          "Good evening. Is there secure parking at the Lekki shortlet if I come with my own car?",
        sentAt: "2026-07-27T18:02",
      },
      {
        id: "conv-2-m2",
        author: "agent",
        body:
          "Good evening! Yes, there is gated parking inside the compound and security on site round the clock.",
        sentAt: "2026-07-27T18:15",
      },
      {
        id: "conv-2-m3",
        author: "agent",
        body:
          "Morning! Just checking in. I have an inspection slot open tomorrow at noon if you would like to see the place before you decide.",
        sentAt: "2026-07-28T08:41",
      },
    ],
  },
  {
    id: "conv-3",
    agentName: "Fatima Bello",
    listing: {
      id: "seed-7",
      slug: "maitama-hilltop-residence",
      title: "Maitama Hilltop Residence",
      area: "Maitama",
      city: "Abuja",
      approved: true,
      verified: true,
      hue: 0,
    },
    messages: [
      {
        id: "conv-3-m1",
        author: "agent",
        body:
          "Hello! Thanks for reaching out about the Maitama Hilltop Residence. Happy to answer any questions about the place.",
        sentAt: "2026-07-26T11:05",
      },
      {
        id: "conv-3-m2",
        author: "guest",
        body:
          "Thank you. I will be in Abuja next month, so I will get back to you closer to my travel date.",
        sentAt: "2026-07-26T11:12",
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
    // Newest activity first, the order every messaging surface uses.
    return SEED_THREADS.map(toSummary).sort((a, b) =>
      b.lastMessageAt.localeCompare(a.lastMessageAt),
    );
  }
  async conversation(id: string): Promise<ConversationThread | null> {
    return SEED_THREADS.find((t) => t.id === id) ?? null;
  }
  async conversationIdForListing(listingId: string): Promise<string | null> {
    const thread = SEED_THREADS.find(
      (t) => t.listing.id === listingId || t.listing.slug === listingId,
    );
    return thread ? thread.id : null;
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
  async conversationIdForListing(): Promise<string | null> {
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
