import { describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/app", () => ({ App: {} }));
vi.mock("@capacitor/browser", () => ({ Browser: {} }));

import { pathOnOurOrigin } from "./deep-links";

const WEBVIEW = "https://www.vallospaces.com";

describe("a universal link or App Link is mapped to a path on our own origin", () => {
  it("keeps path, query and hash from the canonical host", () => {
    expect(pathOnOurOrigin("https://www.vallospaces.com/listing/abc?x=1#photos", WEBVIEW)).toBe(
      "/listing/abc?x=1#photos",
    );
  });

  it("accepts the bare apex too, resolved against the web view's own origin", () => {
    expect(pathOnOurOrigin("https://vallospaces.com/auth/callback?code=c", WEBVIEW)).toBe("/auth/callback?code=c");
  });

  it("refuses every other host, look-alikes included", () => {
    for (const raw of [
      "https://evil.example/listing/abc",
      "https://vallospaces.com.evil.example/listing/abc",
      "https://evilvallospaces.com/listing/abc",
      "http://vallospaces.com/listing/abc",
      "com.vallospaces.app://listing/abc",
      "javascript:alert(1)",
      "not a url",
    ]) {
      expect(pathOnOurOrigin(raw, WEBVIEW), raw).toBeNull();
    }
  });
});
