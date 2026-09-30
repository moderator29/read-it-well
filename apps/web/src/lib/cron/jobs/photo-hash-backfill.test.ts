import { describe, expect, it, vi } from "vitest";

vi.mock("../../photo-hash/hash-server", () => ({ backfillPhotoHashes: vi.fn() }));

const { photoBackfillVerdict } = await import("./photo-hash-backfill");

describe("the nightly photo hash backfill (C8)", () => {
  it("is clean when it hashed, or when nothing was left", () => {
    expect(photoBackfillVerdict([60, 12, 0])).toMatchObject({ outcome: "ok", counts: { hashed: 72, rounds: 3 } });
    expect(photoBackfillVerdict([0])).toMatchObject({ outcome: "ok", counts: { hashed: 0 } });
  });
  it("asks for attention only when it could not hash at all", () => {
    expect(photoBackfillVerdict([null]).alert?.kind).toBe("photo_hash.backfill_unavailable");
    expect(photoBackfillVerdict([60, null]).outcome).toBe("ok");
  });
});
