import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

/**
 * The quiet map, which is the one part of this endpoint that grows.
 *
 * `/api/csp-report` is unauthenticated by necessity: a violation is reported by
 * the browser of somebody who may not be signed in, often on the very page that
 * failed. The route's header lists its four mitigations and each of them is
 * about bounding what one request can cost. This file is about the thing that
 * survives a request: the throttle map, keyed on the directive AND the blocked
 * URL, where the blocked URL is chosen by whoever posts the report.
 *
 * The behaviour under test is deliberately observable rather than internal.
 * Nothing here reaches into the module's private Map, because a test that
 * asserts on a private field re-breaks the moment the eviction policy changes,
 * and the property that actually matters is not "the map has N keys", it is
 * "the map cannot grow without limit, and throttling still works".
 */

function report(blocked: string, directive = "img-src"): Request {
  return new Request("https://vallo.ng/api/csp-report", {
    method: "POST",
    headers: { "content-type": "application/csp-report" },
    body: JSON.stringify({
      "csp-report": {
        "effective-directive": directive,
        "blocked-uri": blocked,
        "document-uri": "https://vallo.ng/listing/abc",
        disposition: "report",
      },
    }),
  });
}

describe("csp report endpoint", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("acknowledges every report with 204, including malformed input", async () => {
    expect((await POST(report("https://evil.example/x.png"))).status).toBe(204);

    const malformed = new Request("https://vallo.ng/api/csp-report", {
      method: "POST",
      body: "not json at all",
    });
    expect((await POST(malformed)).status).toBe(204);
  });

  it("logs a violation once and stays quiet for repeats of the same pair", async () => {
    const blocked = `https://cdn.example/${crypto.randomUUID()}.png`;
    await POST(report(blocked));
    const afterFirst = warn.mock.calls.length;

    await POST(report(blocked));
    await POST(report(blocked));

    expect(warn.mock.calls.length).toBe(afterFirst);
  });

  it("logs distinct blocked sources separately", async () => {
    const before = warn.mock.calls.length;
    await POST(report(`https://a.example/${crypto.randomUUID()}.png`));
    await POST(report(`https://b.example/${crypto.randomUUID()}.png`));
    expect(warn.mock.calls.length).toBe(before + 2);
  });

  /**
   * The actual point of the file.
   *
   * A caller sending a unique blocked URL every time is the shape that used to
   * grow the map forever. The observable consequence of a bounded map is that
   * an early entry is eventually evicted, so the SAME violation logs a second
   * time rather than being throttled for its full quiet window. That is a
   * deliberate and cheap trade: one duplicate log line instead of unbounded
   * memory on a public write surface.
   *
   * If this test fails by NOT logging the first violation again, the map is
   * retaining every key it has ever seen, which is the bug.
   */
  it("evicts old entries under a flood of unique blocked sources", async () => {
    const first = `https://flood.example/first-${crypto.randomUUID()}.png`;
    await POST(report(first));

    // Comfortably past the 500-key ceiling, so the first entry cannot survive.
    for (let i = 0; i < 900; i += 1) {
      await POST(report(`https://flood.example/${i}-${crypto.randomUUID()}.png`));
    }

    const before = warn.mock.calls.length;
    await POST(report(first));
    expect(warn.mock.calls.length).toBe(before + 1);
  });

  it("drops a body larger than the ceiling without reading it", async () => {
    const huge = new Request("https://vallo.ng/api/csp-report", {
      method: "POST",
      headers: { "content-length": String(64 * 1024) },
      body: JSON.stringify({
        "csp-report": {
          "effective-directive": "script-src",
          "blocked-uri": `https://huge.example/${crypto.randomUUID()}`,
        },
      }),
    });

    const before = warn.mock.calls.length;
    expect((await POST(huge)).status).toBe(204);
    expect(warn.mock.calls.length).toBe(before);
  });
});
