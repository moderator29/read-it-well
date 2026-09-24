import { describe, expect, it } from "vitest";
import { forwardedAgentHeader } from "./agent-client";

describe("forwardedAgentHeader (V-19)", () => {
  it("passes the browser's own header on", () => {
    expect(forwardedAgentHeader("Mozilla/5.0 (Linux; Android 14) Chrome/128")).toEqual({
      "user-agent": "Mozilla/5.0 (Linux; Android 14) Chrome/128",
    });
  });
  it("caps it at 512 characters", () => {
    expect(forwardedAgentHeader("x".repeat(2000))["user-agent"]).toHaveLength(512);
  });
  it("sets nothing when there is none, so GoTrue records what it always did", () => {
    expect(forwardedAgentHeader(null)).toEqual({});
    expect(forwardedAgentHeader("   ")).toEqual({});
  });
});
