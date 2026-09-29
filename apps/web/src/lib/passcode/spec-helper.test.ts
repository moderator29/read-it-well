import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { TAB_KEY } from "./tab";
import { deriveKey, passcodeKey, readUnlock, UNLOCK_COOKIE } from "./unlock-cookie";

/**
 * `tests/_passcode.mjs` writes the unlock cookie for the browser specs with
 * its own copy of the signing (a spec is plain Node and cannot import the
 * app). This keeps the copy honest: what it writes, the app reads.
 */
type SpecHelper = {
  TAB_KEY: string;
  UNLOCK_COOKIE: string;
  unlockCookieValue: (userId: string, serviceRoleKey: string, nowSeconds?: number) => string;
};
let spec: SpecHelper;
beforeAll(async () => {
  spec = (await import(pathToFileURL(join(__dirname, "..", "..", "..", "tests", "_passcode.mjs")).href)) as SpecHelper;
});

const USER = "5f1c9a2e-7b1d-4c3e-9a8b-0c1d2e3f4a5b";
const SERVICE = "service-role-key-for-a-test-only";

describe("the browser specs' passcode helper", () => {
  it("writes an unlock cookie the app accepts, for that user only", () => {
    const now = 1_790_000_000;
    const key = passcodeKey("unlock", { SUPABASE_SERVICE_ROLE_KEY: SERVICE } as unknown as NodeJS.ProcessEnv) as Buffer;
    const value = spec.unlockCookieValue(USER, SERVICE, now);
    expect(readUnlock(key, value, USER, now + 60)).not.toBeNull();
    expect(readUnlock(deriveKey("some-other-service-key-value", "unlock"), value, USER, now + 60)).toBeNull();
    expect(spec.UNLOCK_COOKIE).toBe(UNLOCK_COOKIE);
  });

  it("marks tabs with the key the guard reads", () => {
    expect(spec.TAB_KEY).toBe(TAB_KEY);
  });
});
