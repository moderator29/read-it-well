import { describe, expect, it } from "vitest";

/**
 * The photo reference pattern, which is the whole security boundary of
 * `/api/places/photo`.
 *
 * That route takes a value off the query string and interpolates it into a URL
 * it then fetches. That is the shape of a server side request forgery, and the
 * thing standing between the two is this pattern. It is asserted here rather
 * than trusted, because it is the kind of regex somebody widens by one
 * character during an unrelated change.
 *
 * The route keeps a second, independent guarantee that no test can remove: the
 * host is a constant in that file, so even a name that passed this pattern can
 * only ever be interpolated into a `places.googleapis.com` URL. Defence in
 * depth is the point; neither one is load bearing alone.
 */

const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

describe("the photo reference pattern", () => {
  it("accepts what Google actually returns", () => {
    expect(PHOTO_NAME.test("places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AXQ_ab-c_123")).toBe(true);
    expect(PHOTO_NAME.test("places/abc123/photos/XYZ-_9")).toBe(true);
  });

  /*
   * Every one of these is an attempt to leave Google, leave the media endpoint,
   * or reach something on the private network behind this process.
   */
  it("refuses anything that could point somewhere else", () => {
    const attempts = [
      "https://evil.example/x",
      "//evil.example/x",
      "places/../../admin/secrets",
      "places/x/photos/../../../etc/passwd",
      "places/x/photos/y?key=leak",
      "places/x/photos/y#fragment",
      "places/x/photos/y/extra",
      "PLACES/x/photos/y".replace("PLACES", "place"),
      "places/x/photo/y",
      "places//photos/y",
      "places/x/photos/",
      "",
      " places/x/photos/y",
      "places/x/photos/y ",
      "places/x/photos/y\n",
      "places/x/photos/y%2F..%2F",
      "http://169.254.169.254/latest/meta-data",
      "places/x/photos/y:8080",
    ];
    for (const attempt of attempts) {
      expect(PHOTO_NAME.test(attempt), `should refuse: ${JSON.stringify(attempt)}`).toBe(false);
    }
  });

  /*
   * A dot is refused specifically, and that is not incidental. It is what makes
   * `..` unrepresentable, and it is also what stops a hostname ever appearing
   * inside a segment.
   */
  it("refuses a dot anywhere at all", () => {
    expect(PHOTO_NAME.test("places/a.b/photos/c")).toBe(false);
    expect(PHOTO_NAME.test("places/a/photos/c.d")).toBe(false);
  });
});

/**
 * The width, which is the cost boundary rather than the security one. An
 * unbounded `maxWidthPx` reaching Google is an unbounded bill, so the route
 * accepts four values and silently uses the default for anything else.
 */
describe("the width allowlist", () => {
  const WIDTHS = new Set([200, 400, 800, 1200]);
  const DEFAULT_WIDTH = 800;
  const clamp = (raw: string | null) => {
    const asked = Number(raw ?? DEFAULT_WIDTH);
    return WIDTHS.has(asked) ? asked : DEFAULT_WIDTH;
  };

  it("keeps a width that is on the list", () => {
    expect(clamp("400")).toBe(400);
    expect(clamp("1200")).toBe(1200);
  });

  it("falls back for anything else, including nonsense and giants", () => {
    expect(clamp("99999")).toBe(DEFAULT_WIDTH);
    expect(clamp("0")).toBe(DEFAULT_WIDTH);
    expect(clamp("-1")).toBe(DEFAULT_WIDTH);
    expect(clamp("abc")).toBe(DEFAULT_WIDTH);
    expect(clamp(null)).toBe(DEFAULT_WIDTH);
    expect(clamp("401")).toBe(DEFAULT_WIDTH);
  });
});

/**
 * And the CDN check on the way back out, which matters because that value
 * becomes a `Location` header. An open redirect built from an upstream payload
 * would be a phishing primitive on our own domain.
 */
describe("the CDN allowlist on the redirect", () => {
  const CDN = /^https:\/\/[a-z0-9.-]*\.(googleusercontent|ggpht|google)\.com\//i;

  it("accepts Google's own photo hosts", () => {
    expect(CDN.test("https://lh3.googleusercontent.com/places/x")).toBe(true);
    expect(CDN.test("https://lh5.ggpht.com/p/x")).toBe(true);
  });

  it("refuses anywhere else, however it is dressed up", () => {
    for (const uri of [
      "https://evil.example/x",
      "http://lh3.googleusercontent.com/x",
      "https://googleusercontent.com.evil.example/x",
      "https://evil.example/?u=https://lh3.googleusercontent.com/x",
      "javascript:alert(1)",
      "",
    ]) {
      expect(CDN.test(uri), `should refuse: ${uri}`).toBe(false);
    }
  });
});
