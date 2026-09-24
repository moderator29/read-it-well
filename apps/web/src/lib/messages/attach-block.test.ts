import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A BLOCK HOLDS ON A PHOTOGRAPH, INCLUDING ON THE BRANCH THAT ALREADY HAD A
 * MESSAGE TO HANG IT OFF.
 *
 * `attachImage` has two branches. One mints a new message for the photo, and
 * that branch has always asked `guardConversation` first. The other attaches
 * to a message the caller has ALREADY sent, and it asked nothing: the
 * restrictive policy the b5 migration added is on `messages`, so it never saw
 * this insert, and `message_attachments_insert` only asks "is this my message
 * and am I in that conversation", both of which stay true after a block. So a
 * blocked person could hang a picture off one of their own older messages and
 * have it appear in the thread of the person who blocked them.
 *
 * Both branches ask now. This proves it where it can be proved cheaply: the
 * refusal is the block sentence, nothing is written to either table, and the
 * open case still works, so the guard has not simply closed the door on
 * everybody. The database half is the restrictive policy in
 * `supabase/migrations/20260919140000_b3_a_block_holds_on_an_attachment_too.sql`,
 * which has its own database probe.
 */

const GUEST = "11111111-1111-4111-8111-111111111111";
const THREAD = "33333333-3333-4333-8333-333333333333";
const OTHER_THREAD = "77777777-7777-4777-8777-777777777777";
const OLD_MESSAGE = "44444444-4444-4444-8444-444444444444";
const ATTACHMENT = "55555555-5555-4555-8555-555555555555";
const PHOTO = "66666666-6666-4666-8666-666666666666";

const session = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "signed out",
}));
const flags = vi.hoisted(() => ({ isFeatureEnabled: vi.fn() }));
const state = vi.hoisted(() => ({ blocked: false }));

vi.mock("../actions/session", () => session);
vi.mock("../flags", () => flags);
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("../listings/repository", () => ({ getListingRepository: () => ({ byId: async () => null }) }));
vi.mock("../reservations/host", () => ({
  reservationHostUserId: async () => null,
  reservationSpine: () => null,
}));
vi.mock("../security/rate-limit", () => ({
  consume: async () => ({ allowed: true, degraded: false }),
  subjectForUser: (id: string) => `user:${id}`,
}));
vi.mock("../supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("the attachment path must never need the service role");
  },
}));
vi.mock("./blocks", async () => {
  const real = await vi.importActual<typeof import("./blocks")>("./blocks");
  return {
    ...real,
    blockedBetween: async () => state.blocked,
    guardConversation: async () =>
      state.blocked
        ? { ok: false as const, reason: "blocked" as const }
        : { ok: true as const, otherId: "counterpart" },
  };
});

const { attachImage } = await import("./actions");
const { BLOCKED_MESSAGE } = await import("./blocks");

type Write = { table: string; payload: Record<string, unknown> };

/** A PostgREST-shaped stub that records every insert it is asked for. */
function fakeClient(writes: Write[]) {
  const chain = (table: string) => {
    const self = {
      insert(payload: Record<string, unknown>) {
        writes.push({ table, payload });
        return self;
      },
      select: () => self,
      eq: () => self,
      async single() {
        return {
          data: { id: table === "messages" ? OLD_MESSAGE : ATTACHMENT },
          error: null,
        };
      },
      async maybeSingle() {
        return { data: null, error: null };
      },
    };
    return self;
  };
  return { from: (table: string) => chain(table) } as never;
}

let writes: Write[] = [];

beforeEach(() => {
  writes = [];
  state.blocked = false;
  flags.isFeatureEnabled.mockResolvedValue(true);
  session.resolveSession.mockResolvedValue({
    state: "signed-in",
    user: { id: GUEST },
    supabase: fakeClient(writes),
  });
});

describe("attachImage and the block", () => {
  it("refuses a photo onto a message the sender already sent, and writes nothing", async () => {
    state.blocked = true;
    const result = await attachImage({
      conversationId: THREAD,
      messageId: OLD_MESSAGE,
      storagePath: `${THREAD}/${PHOTO}.jpg`,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(BLOCKED_MESSAGE);
    expect(writes).toEqual([]);
  });

  it("refuses a photo that would mint a new message, and writes nothing", async () => {
    state.blocked = true;
    const result = await attachImage({
      conversationId: THREAD,
      storagePath: `${THREAD}/${PHOTO}.jpg`,
    });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toBe(BLOCKED_MESSAGE);
    expect(writes).toEqual([]);
  });

  it("still attaches when nobody has blocked anybody", async () => {
    const result = await attachImage({
      conversationId: THREAD,
      messageId: OLD_MESSAGE,
      storagePath: `${THREAD}/${PHOTO}.jpg`,
    });
    expect(result.ok).toBe(true);
    expect(writes.map((write) => write.table)).toEqual(["message_attachments"]);
  });

  it("still refuses a storage path claiming another conversation's folder", async () => {
    const result = await attachImage({
      conversationId: THREAD,
      messageId: OLD_MESSAGE,
      storagePath: `${OTHER_THREAD}/${PHOTO}.jpg`,
    });
    expect(result.ok).toBe(false);
    expect(writes).toEqual([]);
  });

  /* Rule 1, checked as a codepoint so this file carries no dash itself, the
     same way money-limits.test.ts does it. */
  it("never puts an em dash in the refusal a person reads", () => {
    expect(BLOCKED_MESSAGE).not.toContain(String.fromCharCode(0x2014));
  });
});
