import { describe, expect, it } from "vitest";
import { isPrefetchRequest } from "./prefetch";

const from = (headers: Record<string, string>) => (name: string) => headers[name] ?? null;

describe("isPrefetchRequest (V-73 review)", () => {
  it("knows every way a prefetch announces itself", () => {
    expect(isPrefetchRequest(from({ "next-router-prefetch": "1" }))).toBe(true);
    expect(isPrefetchRequest(from({ purpose: "prefetch" }))).toBe(true);
    expect(isPrefetchRequest(from({ "sec-purpose": "prefetch;prerender" }))).toBe(true);
  });
  it("counts an ordinary visit", () => {
    expect(isPrefetchRequest(from({}))).toBe(false);
    expect(isPrefetchRequest(from({ "sec-purpose": "prerender" }))).toBe(false);
  });
});
