import { describe, expect, it } from "vitest";

import { clipPush, fitPush, PUSH_BODY_MAX, PUSH_TITLE_MAX } from "./copy";

describe("push copy is held to the lock screen", () => {
  it("leaves copy that fits exactly as written", () => {
    expect(fitPush({ title: "Payment received", body: "Tunde paid N360,000." })).toEqual({
      title: "Payment received",
      body: "Tunde paid N360,000.",
    });
  });

  it("cuts an overlong title and body at a word", () => {
    const out = fitPush({ title: "Your crypto payment did not go through today at all", body: "word ".repeat(60) });
    expect(out.title.length).toBeLessThanOrEqual(PUSH_TITLE_MAX);
    expect(out.body.length).toBeLessThanOrEqual(PUSH_BODY_MAX);
    expect(out.title.endsWith("…")).toBe(true);
    expect(out.body).not.toMatch(/wor…$/);
  });

  it("a missing body is an empty line, not 'null'", () => {
    expect(fitPush({ title: "Hi", body: null }).body).toBe("");
    expect(clipPush("  a  b ", 10)).toBe("a b");
  });
});
