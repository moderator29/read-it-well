import { describe, expect, it } from "vitest";
import { bundlePhotos } from "./bundle";

const photo = (id: string, mine = true, timeLabel = "10:42") => ({
  id,
  mine,
  body: "\u{1F4F7} Photo",
  timeLabel,
  imageUrl: `https://example.test/${id}.jpg`,
});
const text = (id: string, body: string, mine = true) => ({
  id,
  mine,
  body,
  timeLabel: "10:42",
  imageUrl: null,
});

describe("photo bundles", () => {
  it("folds a run of photos from one sender in one minute into one bubble", () => {
    const bundles = bundlePhotos([photo("a"), photo("b"), photo("c"), photo("d")]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0]?.items.map((m) => m.id)).toEqual(["a", "b", "c", "d"]);
    expect(bundles[0]?.lead.id).toBe("a");
  });

  it("takes the words that follow the photos as the caption, once", () => {
    const bundles = bundlePhotos([
      photo("a"),
      photo("b"),
      text("t", "Here are more photos"),
      text("u", "And the rent"),
    ]);
    expect(bundles.map((b) => b.items.map((m) => m.id))).toEqual([["a", "b", "t"], ["u"]]);
  });

  it("breaks the run on a photo after the caption, a different sender or a different minute", () => {
    const bundles = bundlePhotos([
      photo("a"),
      text("t", "Here are more photos"),
      photo("b"),
      photo("c", false),
      photo("d", true, "10:43"),
    ]);
    expect(bundles.map((b) => b.items.map((m) => m.id))).toEqual([["a", "t"], ["b"], ["c"], ["d"]]);
  });

  it("never lets words start a run or join words", () => {
    const bundles = bundlePhotos([text("t", "Hello"), text("u", "There"), photo("a")]);
    expect(bundles.map((b) => b.items.map((m) => m.id))).toEqual([["t"], ["u"], ["a"]]);
  });

  it("never bundles a photo that is still sending or failed", () => {
    const bundles = bundlePhotos([photo("a"), { ...photo("b"), state: "sending" as const }]);
    expect(bundles).toHaveLength(2);
  });
});
