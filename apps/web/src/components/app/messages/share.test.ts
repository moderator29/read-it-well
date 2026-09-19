import { describe, expect, it } from "vitest";
import { parseShare, shareBody, shareHref, sharePreview } from "./share";

const ID = "0f5a7c2e-1b3d-4e5f-8a9b-0c1d2e3f4a5b";

describe("a share body", () => {
  it("round-trips a listing", () => {
    const body = shareBody({ kind: "listing", id: ID });
    expect(body).toBe(`Shared a listing\n/listing/${ID}`);
    expect(parseShare(body)).toEqual({ kind: "listing", id: ID });
  });

  it("round-trips a booking onto the trips route", () => {
    const body = shareBody({ kind: "booking", id: ID });
    expect(shareHref({ kind: "booking", id: ID })).toBe(`/bookings/${ID}`);
    expect(parseShare(body)).toEqual({ kind: "booking", id: ID });
  });

  it("round-trips a stay onto its own route, not the listing one", () => {
    const body = shareBody({ kind: "stay", id: ID });
    expect(body).toBe(`Shared a stay\n/stay/${ID}`);
    expect(shareHref({ kind: "stay", id: ID })).toBe(`/stay/${ID}`);
    expect(parseShare(body)).toEqual({ kind: "stay", id: ID });
  });

  it("keeps stay and listing apart, because their ids come from different tables", () => {
    expect(parseShare(`/stay/${ID}`)).toEqual({ kind: "stay", id: ID });
    expect(parseShare(`/listing/${ID}`)).toEqual({ kind: "listing", id: ID });
    /* `/stays` is the browse index, not a share. */
    expect(parseShare(`/stays/${ID}`)).toBeNull();
  });

  it("accepts the bare path and ignores case", () => {
    expect(parseShare(`/LISTING/${ID.toUpperCase()}`)).toEqual({ kind: "listing", id: ID });
  });

  it("leaves prose that mentions a path as prose", () => {
    expect(parseShare(`Have a look at /listing/${ID} when you can`)).toBeNull();
    expect(parseShare("Hello")).toBeNull();
    expect(parseShare("/listing/not-a-uuid")).toBeNull();
  });

  it("previews a share as words, never as a path", () => {
    expect(sharePreview(shareBody({ kind: "booking", id: ID }))).toBe("Shared a booking");
    expect(sharePreview("Are you free on Saturday?")).toBeNull();
  });
});
