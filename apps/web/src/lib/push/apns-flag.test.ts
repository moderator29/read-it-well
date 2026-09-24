import { describe, expect, it } from "vitest";
import { apnsIsOpen, gatePlatforms } from "./apns-flag";
import type { PushClient } from "./schema";

function client(answer: { data: unknown; error: unknown } | Error): PushClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (answer instanceof Error) throw answer;
            return answer;
          },
        }),
      }),
    }),
  } as unknown as PushClient;
}

describe("native_push_apns, fail closed (V-53)", () => {
  it("is open only for a row that says true", async () => {
    await expect(apnsIsOpen(client({ data: { enabled: true }, error: null }))).resolves.toBe(true);
    await expect(apnsIsOpen(client({ data: { enabled: false }, error: null }))).resolves.toBe(false);
    await expect(apnsIsOpen(client({ data: null, error: null }))).resolves.toBe(false);
    await expect(apnsIsOpen(client({ data: null, error: { message: "x" } }))).resolves.toBe(false);
    await expect(apnsIsOpen(client(new Error("down")))).resolves.toBe(false);
  });
  it("removes iOS from the drain's platforms unless opened", () => {
    expect(gatePlatforms(["web", "android", "ios"], false)).toEqual(["web", "android"]);
    expect(gatePlatforms(["web", "android", "ios"], true)).toEqual(["web", "android", "ios"]);
  });
});
