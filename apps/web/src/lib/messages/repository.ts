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
 * **THERE ARE NO SEED CONVERSATIONS HERE ANY MORE, and that is the point.**
 *
 * This module used to export `SEED_THREADS`: three complete conversations with
 * named agents, "Adaeze Okafor" among them, about real published listings, with
 * plausible timestamps and unread badges. Nothing selected them but being
 * signed out, and two routes rendered them through the very same components a
 * real person's real messages use, with no label of any kind.
 *
 * `/messages` showed a stranger an inbox of people they had never spoken to.
 * `/messages/[id]` was worse: it rendered the whole thread and mapped
 * `mine: m.author === "guest"`, so a visitor was shown words they had never
 * written, attributed to them, in a conversation with somebody who does not
 * exist.
 *
 * `lib/agent/repository.ts` had already settled this question when it deleted
 * its own seeded agent: **identity is the one thing a "designed figures" label
 * cannot rescue.** The agent dashboard survives with invented numbers because a
 * revenue figure is not a person, and it says "Designed figures" above them
 * anyway. A label under invented conversations from a named individual would
 * not have made them honest, it would have made them a labelled lie about
 * somebody with a name.
 *
 * So a signed-out reader is told the truth: there is nothing here yet, and here
 * is how a conversation starts. The fixture is gone rather than hidden, because
 * a fixture nobody renders is the same half as a table with no screen.
 *
 * What is left is deliberately empty rather than deleted outright. Three other
 * routes ask `conversationIdForListing` to deep link a "Message the agent"
 * button into an existing thread, and all three already fall back to `/messages`
 * when the answer is null. Answering null is therefore the honest answer and
 * not a degradation.
 *
 * Selected by NF_DATA_SOURCE:
 *   unset (default) no local conversations exist; the real ones need a session
 *   "api"           the real platform API, which is not built yet
 */

/**
 * No local messaging data.
 *
 * A real conversation lives in Postgres behind RLS and is read by
 * `lib/messages/live.ts` with the reader's own session. There is no such thing
 * as a conversation without somebody to have it, so signed out there is nothing
 * to serve and this says so in the only way that cannot lie.
 */
class EmptyMessageRepository implements MessageRepository {
  readonly isSeed = false;
  async conversations(): Promise<ConversationSummary[]> {
    return [];
  }
  async conversation(): Promise<ConversationThread | null> {
    return null;
  }
  async conversationIdForListing(): Promise<string | null> {
    return null;
  }
}

class ApiMessageRepository implements MessageRepository {
  readonly isSeed = false;
  async conversations(): Promise<ConversationSummary[]> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the messaging API is not implemented yet. " +
        "Unset it to fall back to the signed-in reader's own conversations.",
    );
  }
  async conversation(): Promise<ConversationThread | null> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the messaging API is not implemented yet. " +
        "Unset it to fall back to the signed-in reader's own conversations.",
    );
  }
  async conversationIdForListing(): Promise<string | null> {
    throw new Error(
      "NF_DATA_SOURCE is set to 'api' but the messaging API is not implemented yet. " +
        "Unset it to fall back to the signed-in reader's own conversations.",
    );
  }
}

export function getMessageRepository(): MessageRepository {
  return process.env.NF_DATA_SOURCE === "api"
    ? new ApiMessageRepository()
    : new EmptyMessageRepository();
}
