import { describe, expect, it } from "vitest";
import { describeDevice } from "./device";
import { forwardedAgentHeader, stableAgent } from "./agent-client";

const CHROME_128 =
  "Mozilla/5.0 (Linux; Android 14; SM-A146P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36";
const CHROME_129 =
  "Mozilla/5.0 (Linux; Android 14; SM-A146P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Mobile Safari/537.36";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

describe("stableAgent (V-19)", () => {
  it("is the same across a browser update, so an update is not a new device", () => {
    expect(stableAgent(CHROME_128)).toBe(stableAgent(CHROME_129));
    expect(stableAgent(CHROME_128)).not.toMatch(/\d{2,}/);
  });
  it("keeps the family and platform the devices screen and device_words read", () => {
    expect(describeDevice(stableAgent(CHROME_128))).toEqual({ kind: "device", browser: "Chrome", platform: "Android" });
    expect(describeDevice(stableAgent(SAFARI_IOS))).toEqual({ kind: "device", browser: "Safari", platform: "iOS" });
    for (const ua of [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 Edg/128.0",
      "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121 Mobile Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0",
    ]) {
      expect(describeDevice(stableAgent(ua))).toEqual(describeDevice(ua));
    }
  });
  it("removes the numbers from an agent it cannot name", () => {
    expect(stableAgent("SomeReader/4.2.1 build 77")).toBe("SomeReader/ build");
  });
  it("forwards nothing for our own server or an empty header", () => {
    expect(stableAgent("node")).toBeNull();
    expect(forwardedAgentHeader(null)).toEqual({});
    expect(forwardedAgentHeader("   ")).toEqual({});
  });
  it("sends the stable form as the header", () => {
    expect(forwardedAgentHeader(CHROME_128)).toEqual({ "user-agent": "Mozilla/5.0 (Linux; Android) Chrome/" });
  });
});
