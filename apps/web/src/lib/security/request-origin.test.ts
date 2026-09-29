import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./request-origin";

const post = (headers: Record<string, string>) =>
  new Request("https://www.vallospaces.com/api/push/register", { method: "POST", headers });

describe("isSameOriginRequest", () => {
  it("accepts our own origin", () => {
    expect(isSameOriginRequest(post({ origin: "https://www.vallospaces.com", "sec-fetch-site": "same-origin" }))).toBe(true);
  });
  it("refuses a foreign origin", () => {
    expect(isSameOriginRequest(post({ origin: "https://evil.example" }))).toBe(false);
  });
  it("refuses a browser that says cross-site even without an origin", () => {
    expect(isSameOriginRequest(post({ "sec-fetch-site": "cross-site" }))).toBe(false);
  });
  it("refuses the null origin a sandboxed frame sends", () => {
    expect(isSameOriginRequest(post({ origin: "null" }))).toBe(false);
  });
  it("lets a request with no browser headers through to the session check", () => {
    expect(isSameOriginRequest(post({}))).toBe(true);
  });
});
