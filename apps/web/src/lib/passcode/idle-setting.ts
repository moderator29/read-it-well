import { IDLE_LOCK_MS } from "./rules";

/**
 * THE LONGER IDLE LOCK, BEHIND A SETTING (C14, founder's decision pending).
 *
 * On a device where the member has a registered passkey, and only when they
 * turn it on in Settings, Passcode, the app locks after fifteen minutes idle
 * instead of five. The passkey is what makes the longer window reasonable:
 * getting back in is one touch, and the key proves the person, not the tab.
 *
 * Stored per device (localStorage), because it is a statement about THIS
 * phone. Fifteen minutes is also the server's sliding unlock
 * (`UNLOCK_IDLE_SECONDS`), so the cookie never outlives the client's lock.
 */
export const LONG_IDLE_LOCK_MS = 15 * 60 * 1000;
export const LONG_IDLE_KEY = "vallo.passcode.idle15.v1";

/** The idle limit for this device: fifteen minutes only with a key AND the setting on. */
export function idleLimitMs(hasPasskey: boolean, longIdleOn: boolean): number {
  return hasPasskey && longIdleOn ? LONG_IDLE_LOCK_MS : IDLE_LOCK_MS;
}

export function readLongIdle(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(LONG_IDLE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLongIdle(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(LONG_IDLE_KEY, "1");
    else window.localStorage.removeItem(LONG_IDLE_KEY);
  } catch {
    /* Private mode: the five-minute lock stays, which is the safe side. */
  }
}
