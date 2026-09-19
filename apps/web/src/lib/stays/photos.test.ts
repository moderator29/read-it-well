import { describe, expect, it } from "vitest";

import { photoUrl } from "../listings/supabase-repository";
import { accommodationPhotoUrl } from "./photos";

/**
 * Three shapes of storage_path, three answers. A bucket path becomes the
 * public object URL; an absolute URL and an absolute public path (the example
 * stays seed) pass through untouched, so the photograph the lead filed under
 * apps/web/public is the one the page asks for.
 */
describe("accommodationPhotoUrl", () => {
  it("passes an absolute public path through untouched", () => {
    expect(accommodationPhotoUrl("/brand/photos/bedroom-01.jpg")).toBe("/brand/photos/bedroom-01.jpg");
  });

  it("passes an absolute URL through untouched", () => {
    expect(accommodationPhotoUrl("https://cdn.example.invalid/a.jpg")).toBe("https://cdn.example.invalid/a.jpg");
  });

  it("turns a bucket path into the public object URL, once", () => {
    const url = accommodationPhotoUrl("accommodation-photos/u1/cover.jpg");
    expect(url).toMatch(/\/storage\/v1\/object\/public\/accommodation-photos\/u1\/cover\.jpg$/);
    expect(url).not.toMatch(/accommodation-photos\/accommodation-photos/);
  });
});

/**
 * The listing twin, held beside this one. `listing_photos` for the b2 example
 * listings carry the same `/brand/photos/<name>.jpg` shape, and the listing
 * repository's `photoUrl` used to strip the slash and point at a bucket object
 * that does not exist. Both definitions now answer the three shapes alike.
 */
describe("listing photoUrl, the twin", () => {
  it("passes an absolute public path through untouched", () => {
    expect(photoUrl("/brand/photos/bedroom-01.jpg")).toBe("/brand/photos/bedroom-01.jpg");
  });

  it("passes an absolute URL through untouched", () => {
    expect(photoUrl("https://cdn.example.invalid/a.jpg")).toBe("https://cdn.example.invalid/a.jpg");
  });

  it("turns a bucket path into the public object URL, once", () => {
    const url = photoUrl("listing-photos/u1/cover.jpg");
    expect(url).toMatch(/\/storage\/v1\/object\/public\/listing-photos\/u1\/cover\.jpg$/);
    expect(url).not.toMatch(/listing-photos\/listing-photos/);
    expect(photoUrl("u1/cover.jpg")).toMatch(/\/storage\/v1\/object\/public\/listing-photos\/u1\/cover\.jpg$/);
  });
});
