import type { DeviceDescription } from "./device";

/**
 * UX-28: how many DEVICES a person is signed in on.
 *
 * Every sign-in is its own session row, so a person who signs in on the web
 * each week saw "84 devices" in Settings and "86 signed in" in Privacy for one
 * phone and one laptop. The count on those rows is of distinct devices (kind,
 * browser and platform, as described), which is what the words promise; the
 * device list itself still shows every session so each can be ended.
 */
export function distinctDeviceCount(sessions: readonly { device: DeviceDescription }[]): number {
  return new Set(sessions.map(({ device }) => `${device.kind}|${device.browser ?? ""}|${device.platform ?? ""}`)).size;
}
