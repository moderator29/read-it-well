import { beforeEach, describe, expect, it, vi } from "vitest";
import { shareBody } from "@/components/app/messages/share";
import { factsFrom } from "@/lib/passport/model";

/**
 * A PASSPORT CARD IN A THREAD draws only for the member who sent it, and only
 * when the read lets the reader see it. The read itself (off, blocked, hidden
 * lines) is `lib/passport/passport-read.ts` over `passport_read`; this holds the
 * thread's own rule on top: a body that points at somebody else's passport is
 * words and a path, never a card.
 */

const OWNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const readPassportCard = vi.fn();
vi.mock("@/lib/passport/passport-read", () => ({ readPassportCard: (id: string) => readPassportCard(id) }));
vi.mock("@/lib/listings/repository", () => ({ getListingRepository: () => ({ byId: async () => null }) }));
vi.mock("@/lib/stays/queries", () => ({ getStayDetail: async () => null }));
vi.mock("@/lib/stays/photos", () => ({ accommodationPhotoUrl: () => "" }));

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

beforeEach(() => {
  readPassportCard.mockReset();
  readPassportCard.mockResolvedValue(FACTS);
});

const body = shareBody({ kind: "passport", id: OWNER });

describe("the passport card in a thread", () => {
  it("draws for the member who sent it, with the counts they share", async () => {
    const { resolveCards } = await import("./cards");
    const cards = await resolveCards({} as never, [{ id: "m1", body, senderId: OWNER }], "en");
    const card = cards.get("m1");
    expect(card?.kind).toBe("passport");
    if (card?.kind === "passport") {
      expect(card.id).toBe(OWNER);
      expect(card.view.name).toBe("Ada Okafor");
      expect(card.view.joined).toBe("7 August 2026");
      expect(card.view.stats.map((s) => s.key)).toEqual(["rentals"]);
      expect(card.copy.title).toBe("Vallo passport");
    }
    expect(readPassportCard).toHaveBeenCalledWith(OWNER);
  });

  it("never draws somebody else's passport as if the sender were showing it", async () => {
    const { resolveCards } = await import("./cards");
    /* Sent by another member, or with no known sender: words and a path only, and no read at all. */
    const cards = await resolveCards(
      {} as never,
      [
        { id: "m1", body, senderId: OTHER },
        { id: "m2", body, senderId: null },
        { id: "m3", body },
      ],
      "en",
    );
    expect(cards.size).toBe(0);
    expect(readPassportCard).not.toHaveBeenCalled();
  });

  it("falls back to words and a path when the read refuses (off, blocked, signed out)", async () => {
    readPassportCard.mockResolvedValue(null);
    const { resolveCards } = await import("./cards");
    const cards = await resolveCards({} as never, [{ id: "m1", body, senderId: OWNER }], "en");
    expect(cards.size).toBe(0);
  });

  it("reads one passport once however many times it is shown", async () => {
    const { resolveCards } = await import("./cards");
    await resolveCards(
      {} as never,
      [
        { id: "m1", body, senderId: OWNER },
        { id: "m2", body, senderId: OWNER },
      ],
      "en",
    );
    expect(readPassportCard).toHaveBeenCalledTimes(1);
  });
});
