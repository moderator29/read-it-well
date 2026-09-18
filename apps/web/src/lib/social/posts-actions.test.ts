import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The feed cursor, consumed. `loadMoreFeed` is the server action the feed's
 * load-more control calls; these prove its edges: no cursor is an ended page
 * and never a second first page, a cursor that is not an instant is refused
 * before Postgres sees it, a place id that is not a uuid is refused, "joined"
 * never pages another person's places, and the three modes reach the three
 * reads with the cursor intact.
 */
const reads = vi.hoisted(() => ({
  getAreaFeed: vi.fn(),
  getEverywhereFeed: vi.fn(),
  getJoinedFeed: vi.fn(),
  session: { state: "signed-in", user: { id: "user-1" } } as { state: string; user?: { id: string } },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./posts-queries", () => ({
  getAreaFeed: reads.getAreaFeed,
  getEverywhereFeed: reads.getEverywhereFeed,
  getJoinedFeed: reads.getJoinedFeed,
}));
vi.mock("./flag", () => ({ SOCIAL_OFF_MESSAGE: "off", isSocialEnabled: async () => true }));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "unconfigured",
  SIGNED_OUT_MESSAGE: "signed out",
  resolveSession: async () => reads.session,
}));
vi.mock("../security/rate-limit", () => ({
  consume: vi.fn(),
  retryIn: () => "later",
  subjectForUser: (id: string) => `user:${id}`,
}));

const PAGE = { posts: [], cursor: "2026-09-18T10:00:00.000Z", ended: false };
const AREA = "6f1c2b0e-3d4a-4b5c-8d6e-7f8091a2b3c4";

beforeEach(() => {
  reads.getAreaFeed.mockReset().mockResolvedValue(PAGE);
  reads.getEverywhereFeed.mockReset().mockResolvedValue(PAGE);
  reads.getJoinedFeed.mockReset().mockResolvedValue(PAGE);
  reads.session = { state: "signed-in", user: { id: "user-1" } };
});

describe("loadMoreFeed", () => {
  it("answers an ended page for no cursor, without reading", async () => {
    const { loadMoreFeed } = await import("./posts-actions");
    const result = await loadMoreFeed(null);
    expect(result).toEqual({ ok: true, data: { posts: [], cursor: null, ended: true } });
    expect(reads.getEverywhereFeed).not.toHaveBeenCalled();
  });

  it("refuses a cursor that is not an instant before any read", async () => {
    const { loadMoreFeed } = await import("./posts-actions");
    const result = await loadMoreFeed("yesterday");
    expect(result.ok).toBe(false);
    expect(reads.getEverywhereFeed).not.toHaveBeenCalled();
  });

  it("pages everywhere by default with the cursor intact", async () => {
    const { loadMoreFeed } = await import("./posts-actions");
    const result = await loadMoreFeed("2026-09-18T12:00:00.000Z");
    expect(result.ok).toBe(true);
    expect(reads.getEverywhereFeed).toHaveBeenCalledWith("2026-09-18T12:00:00.000Z");
  });

  it("pages a place by its id and refuses a place that is not a uuid", async () => {
    const { loadMoreFeed } = await import("./posts-actions");
    await loadMoreFeed("2026-09-18T12:00:00.000Z", { kind: "area", areaId: AREA });
    expect(reads.getAreaFeed).toHaveBeenCalledWith(AREA, "2026-09-18T12:00:00.000Z");
    const bad = await loadMoreFeed("2026-09-18T12:00:00.000Z", { kind: "area", areaId: "lekki" });
    expect(bad.ok).toBe(false);
  });

  it("pages the joined timeline as the signed-in viewer and never as somebody else", async () => {
    const { loadMoreFeed } = await import("./posts-actions");
    await loadMoreFeed("2026-09-18T12:00:00.000Z", { kind: "joined" });
    expect(reads.getJoinedFeed).toHaveBeenCalledWith("user-1", "2026-09-18T12:00:00.000Z");
  });

  it("answers an ended page for a joined timeline when nobody is signed in", async () => {
    reads.session = { state: "signed-out" };
    const { loadMoreFeed } = await import("./posts-actions");
    const result = await loadMoreFeed("2026-09-18T12:00:00.000Z", { kind: "joined" });
    expect(result).toEqual({ ok: true, data: { posts: [], cursor: null, ended: true } });
    expect(reads.getJoinedFeed).not.toHaveBeenCalled();
  });

  it("passes the read's own ended page through unchanged", async () => {
    reads.getEverywhereFeed.mockResolvedValue({ posts: [], cursor: null, ended: true });
    const { loadMoreFeed } = await import("./posts-actions");
    const result = await loadMoreFeed("2026-09-18T12:00:00.000Z");
    expect(result).toEqual({ ok: true, data: { posts: [], cursor: null, ended: true } });
  });
});
