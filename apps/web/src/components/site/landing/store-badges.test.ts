import { describe, expect, it } from "vitest";

import { storeBadges } from "./store-badges";

/** STORE-06: both badges show; each is a link only when it leads to its store. */
describe("store badges", () => {
  it("shows both as coming soon while no store URL exists (never /start dressed as a store)", () => {
    const none = [
      { store: "ios", href: null },
      { store: "android", href: null },
    ];
    expect(storeBadges({ appStoreUrl: undefined, playStoreUrl: undefined, native: false })).toEqual(none);
    expect(storeBadges({ appStoreUrl: "", playStoreUrl: "/start", native: false })).toEqual(none);
  });

  it("links a badge only to that store's own address", () => {
    expect(
      storeBadges({
        appStoreUrl: "https://apps.apple.com/ng/app/vallo/id123456789",
        playStoreUrl: "https://example.com/vallo",
        native: false,
      }),
    ).toEqual([
      { store: "ios", href: "https://apps.apple.com/ng/app/vallo/id123456789" },
      { store: "android", href: null },
    ]);
    expect(
      storeBadges({
        appStoreUrl: "https://play.google.com/store/apps/details?id=x",
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.vallospaces.app",
        native: false,
      }),
    ).toEqual([
      { store: "ios", href: null },
      { store: "android", href: "https://play.google.com/store/apps/details?id=com.vallospaces.app" },
    ]);
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
