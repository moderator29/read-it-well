import { describe, expect, it } from "vitest";

import { storeBadges } from "./store-badges";

/** STORE-06 / UI-07 / UX-26: a badge is drawn only when it leads to its store. */
describe("store badges", () => {
  it("draws none while no store URL exists (they used to fall back to /start)", () => {
    expect(storeBadges({ appStoreUrl: undefined, playStoreUrl: undefined, native: false })).toEqual([]);
    expect(storeBadges({ appStoreUrl: "", playStoreUrl: "/start", native: false })).toEqual([]);
  });

  it("draws a badge only for that store's own address", () => {
    expect(
      storeBadges({
        appStoreUrl: "https://apps.apple.com/ng/app/vallo/id123456789",
        playStoreUrl: "https://example.com/vallo",
        native: false,
      }),
    ).toEqual([{ store: "ios", href: "https://apps.apple.com/ng/app/vallo/id123456789" }]);
    expect(
      storeBadges({
        appStoreUrl: undefined,
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.vallospaces.app",
        native: false,
      }),
    ).toEqual([{ store: "android", href: "https://play.google.com/store/apps/details?id=com.vallospaces.app" }]);
  });

  it("draws none inside a native shell, even with both URLs set", () => {
    expect(
      storeBadges({
        appStoreUrl: "https://apps.apple.com/ng/app/vallo/id123456789",
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.vallospaces.app",
        native: true,
      }),
    ).toEqual([]);
  });
});
