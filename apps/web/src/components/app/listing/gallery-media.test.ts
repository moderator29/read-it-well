import { describe, expect, it } from "vitest";
import { clockOf, listingMedia, photosAsMedia } from "./gallery-media";

const P = ["/p/1.jpg", "/p/2.jpg", "/p/3.jpg"];
const video = (name: string, position?: number) => ({
  url: `/v/${name}.mp4`,
  posterUrl: `/v/${name}.jpg`,
  durationSeconds: 42,
  ...(position === undefined ? {} : { position }),
});

describe("listingMedia", () => {
  it("lays three photos and two videos out in the lister's order, cover first", () => {
    const row = listingMedia(P, [video("a", 2), video("b", 4)]);
    expect(row.map((m) => `${m.kind}:${m.src}`)).toEqual([
      "photo:/p/1.jpg",
      "photo:/p/2.jpg",
      "video:/v/a.mp4",
      "photo:/p/3.jpg",
      "video:/v/b.mp4",
    ]);
    expect(row[2]).toEqual({ kind: "video", src: "/v/a.mp4", poster: "/v/a.jpg", durationSeconds: 42 });
  });

  it("never puts a video ahead of the cover photo", () => {
    const row = listingMedia(P, [video("a", 0)]);
    expect(row[0]).toEqual({ kind: "photo", src: "/p/1.jpg" });
    expect(row[1]!.kind).toBe("video");
  });

  it("places videos with no stored place right after the cover, in upload order", () => {
    const row = listingMedia(P, [video("a"), video("b")]);
    expect(row.map((m) => m.kind)).toEqual(["photo", "video", "video", "photo", "photo"]);
    expect(row[1]!.src).toBe("/v/a.mp4");
  });

  it("is the photo list unchanged when there are no videos", () => {
    expect(listingMedia(P, undefined)).toEqual(photosAsMedia(P));
    expect(listingMedia(P, [])).toEqual(photosAsMedia(P));
  });
});

describe("clockOf", () => {
  it("reads minutes and seconds", () => {
    expect(clockOf(42)).toBe("0:42");
    expect(clockOf(60)).toBe("1:00");
    expect(clockOf(59.6)).toBe("1:00");
    expect(clockOf(5)).toBe("0:05");
  });
});
