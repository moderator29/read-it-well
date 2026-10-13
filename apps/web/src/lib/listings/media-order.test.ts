import { describe, expect, it } from "vitest";
import { canMove, mergeMedia, photoFirst, storedPositions } from "./media-order";

const p = (id: string, position: number) => ({ id, position });
const v = (id: string, position: number) => ({ id, position });
const ids = (row: { kind: string; item: { id: string } }[]) => row.map((e) => `${e.kind[0]}:${e.item.id}`);

describe("one row from two tables", () => {
  it("puts each video at the place it names and fills the photos in rank order", () => {
    const row = mergeMedia([p("a", 0), p("b", 1), p("c", 2)], [v("x", 1), v("y", 3)]);
    expect(ids(row)).toEqual(["p:a", "v:x", "p:b", "v:y", "p:c"]);
  });

  it("never puts a video ahead of the cover while there is a photo", () => {
    expect(ids(mergeMedia([p("a", 0)], [v("x", 0)]))).toEqual(["p:a", "v:x"]);
  });

  it("reads a video stored before the scheme (0, 1, 2 among videos) just after the cover", () => {
    const row = mergeMedia([p("a", 0), p("b", 1), p("c", 2)], [v("x", 0), v("y", 1)]);
    expect(ids(row)).toEqual(["p:a", "v:x", "v:y", "p:b", "p:c"]);
  });

  it("clamps a video whose place is past the end of a row that has grown shorter", () => {
    expect(ids(mergeMedia([p("a", 0)], [v("x", 7)]))).toEqual(["p:a", "v:x"]);
    expect(ids(mergeMedia([p("a", 0)], [v("x", 5), v("y", 5)]))).toEqual(["p:a", "v:x", "v:y"]);
  });

  it("keeps videos when there is no photo at all", () => {
    expect(ids(mergeMedia([], [v("x", 2), v("y", 0)]))).toEqual(["v:y", "v:x"]);
  });

  it("round-trips through the stored positions", () => {
    const row = [
      { kind: "photo" as const, id: "a" },
      { kind: "video" as const, id: "x" },
      { kind: "photo" as const, id: "b" },
      { kind: "photo" as const, id: "c" },
      { kind: "video" as const, id: "y" },
    ];
    const stored = storedPositions(row);
    expect(stored).toEqual({ photos: ["a", "b", "c"], videos: [{ id: "x", position: 1 }, { id: "y", position: 4 }] });
    const back = mergeMedia(
      stored.photos.map((id, i) => p(id, i)),
      stored.videos.map((x) => v(x.id, x.position)),
    );
    expect(back.map((e) => e.item.id)).toEqual(["a", "x", "b", "c", "y"]);
  });
});

describe("the cover is always a photo", () => {
  const row = [
    { kind: "photo" as const },
    { kind: "video" as const },
    { kind: "photo" as const },
  ];

  it("refuses a move that would put a video first", () => {
    expect(canMove(row, 1, 0)).toBe(false);
    expect(canMove(row, 0, 1)).toBe(false);
    expect(canMove(row, 2, 0)).toBe(true);
    expect(canMove(row, 1, 2)).toBe(true);
  });

  it("brings the first photo forward when a video is left at the head", () => {
    expect(photoFirst([{ kind: "video", n: 1 }, { kind: "photo", n: 2 }, { kind: "video", n: 3 }]).map((e) => e.n)).toEqual([2, 1, 3]);
    expect(photoFirst([{ kind: "video", n: 1 }]).map((e) => e.n)).toEqual([1]);
  });
});
