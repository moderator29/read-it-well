import { describe, expect, it } from "vitest";
import { distinctDeviceCount } from "./device-count";

/** UX-28: one phone signed in forty times is one device. */
describe("the device count", () => {
  const phone = { kind: "phone", browser: "Chrome", platform: "Android" } as const;
  const laptop = { kind: "desktop", browser: "Safari", platform: "macOS" } as const;

  it("counts devices, not sign-ins", () => {
    const sessions = [...Array.from({ length: 40 }, () => ({ device: phone })), { device: laptop }, { device: laptop }];
    expect(distinctDeviceCount(sessions as never)).toBe(2);
  });

  it("counts nothing as nothing", () => {
    expect(distinctDeviceCount([])).toBe(0);
  });
});
