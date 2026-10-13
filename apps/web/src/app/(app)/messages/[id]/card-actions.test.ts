import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { shareBody } from "@/components/app/messages/share";
import { factsFrom } from "@/lib/passport/model";

/**
 * A SHARE THAT ARRIVES LIVE BECOMES ITS CARD, ON THE SAME TERMS AS ONE THE PAGE
 * LOADED. Before this, a passport sent in a chat reached the other side as its
 * words and a path until they reloaded. The open thread now asks the server for
 * the card (`resolveLiveCard`), and the server builds it with `resolveCards`,
 * the function the page uses, so the rule for what draws as a card (`cardRefFor`)
 * is one rule.
 */

const OWNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const CONVERSATION = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MESSAGE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const readPassportCard = vi.fn();
vi.mock("@/lib/passport/passport-read", () => ({ readPassportCard: (id: string) => readPassportCard(id) }));
vi.mock("@/lib/listings/repository", () => ({ getListingRepository: () => ({ byId: async () => null }) }));
vi.mock("@/lib/stays/queries", () => ({ getStayDetail: async () => null }));
vi.mock("@/lib/stays/photos", () => ({ accommodationPhotoUrl: () => "" }));
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));

type Row = { id: string; body: string; sender_id: string | null } | null;
let session:
  | { state: "unconfigured" }
  | { state: "signed-out" }
  | { state: "signed-in"; supabase: unknown; user: { id: string } };
let row: Row = null;
let rowError: unknown = null;
const eqs: [string, string][] = [];

function supabase() {
  const chain = {
    select: () => chain,
    eq: (column: string, value: string) => {
      eqs.push([column, value]);
      return chain;
    },
    maybeSingle: async () => ({ data: row, error: rowError }),
  };
  return { from: () => chain };
}

vi.mock("@/lib/actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  SIGNED_OUT_MESSAGE: "Sign in to continue.",
  resolveSession: async () => session,
}));

const FACTS = factsFrom({
  subject_id: OWNER,
  handle: "ada",
  display_name: "Ada Okafor",
  photo: null,
  roles: ["renter"],
  joined_at: "2026-08-07T08:00:00Z",
  verification: "none",
  rentals: 2,
  stays: null,
  review_count: null,
  review_average: null,
  reply_band: null,
  pidgin_ok: null,
});

const passportBody = shareBody({ kind: "passport", id: OWNER });

beforeEach(() => {
  readPassportCard.mockReset();
  readPassportCard.mockResolvedValue(FACTS);
  session = { state: "signed-in", supabase: supabase(), user: { id: OTHER } };
  row = { id: MESSAGE, body: passportBody, sender_id: OWNER };
  rowError = null;
  eqs.length = 0;
});

const ask = async (input: unknown = { conversationId: CONVERSATION, messageId: MESSAGE }) => {
  const { resolveLiveCard } = await import("./card-actions");
  return resolveLiveCard(input);
};

describe("the card for a message that arrived live", () => {
  it("gives the receiver the passport card the sender posted, the same one the page would draw", async () => {
    const result = await ask();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const card = result.data.card;
    expect(card?.kind).toBe("passport");
    if (card?.kind === "passport") {
      expect(card.id).toBe(OWNER);
      expect(card.view.name).toBe("Ada Okafor");
      expect(card.copy.title).toBe("Vallo passport");
    }
    /* The row is read by its id AND its conversation, under the reader's own client. */
    expect(eqs).toEqual([
      ["id", MESSAGE],
      ["conversation_id", CONVERSATION],
    ]);
  });

  it("takes the sender from the row, never from the request: somebody else's passport is words and a path", async () => {
    row = { id: MESSAGE, body: passportBody, sender_id: OTHER };
    const result = await ask({ conversationId: CONVERSATION, messageId: MESSAGE, senderId: OWNER });
    expect(result).toEqual({ ok: true, data: { card: null } });
    expect(readPassportCard).not.toHaveBeenCalled();
  });

  it("answers no card when the passport is off or blocked (the read refuses), so the words stay", async () => {
    readPassportCard.mockResolvedValue(null);
    expect(await ask()).toEqual({ ok: true, data: { card: null } });
  });

  it("answers no card for ordinary words, and for a message this member cannot read", async () => {
    row = { id: MESSAGE, body: "See you at 4", sender_id: OWNER };
    expect(await ask()).toEqual({ ok: true, data: { card: null } });
    row = null;
    expect(await ask()).toEqual({ ok: true, data: { card: null } });
    row = { id: MESSAGE, body: passportBody, sender_id: OWNER };
    rowError = { code: "42501" };
    expect(await ask()).toEqual({ ok: true, data: { card: null } });
  });

  it("refuses a signed-out caller and a malformed request, and reads nothing for either", async () => {
    session = { state: "signed-out" };
    expect((await ask()).ok).toBe(false);
    session = { state: "signed-in", supabase: supabase(), user: { id: OTHER } };
    expect((await ask({ conversationId: "nope", messageId: MESSAGE })).ok).toBe(false);
    expect(eqs).toEqual([]);
    expect(readPassportCard).not.toHaveBeenCalled();
  });
});

describe("one rule, two paths", () => {
  const root = join(__dirname, "..", "..", "..", "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");

  it("the page's expansion and the live arrival both decide with cardRefFor, and neither parses a share itself", () => {
    const cards = read("app/(app)/messages/[id]/cards.ts");
    expect(cards).toContain("cardRefFor(message)");
    expect(cards).not.toMatch(/\bparseShare\(/);

    const thread = read("app/(app)/messages/[id]/ThreadView.tsx");
    const live = thread.slice(thread.indexOf("useThreadRealtime(live"), thread.indexOf("The safety education moment"));
    expect(live).toContain("cardRefFor({ body: row.body, senderId: row.sender_id })");
    expect(live).toContain("resolveLiveCard({ conversationId, messageId: row.id })");
    expect(live).toContain("attachCard(prev, row.id, card)");
  });
});
