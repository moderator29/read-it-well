import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { redactSecrets } from "./http";

/**
 * A refusal may quote the upstream. It may never quote the key.
 *
 * `requestJson` used to throw the upstream's body away and report only
 * "places.googleapis.com answered 403". That is the same string for five
 * completely different faults, and the owner cannot act on any of them.
 * Surfacing what Google actually said is the fix, and it trades a guarantee we
 * had for free (nothing from the body can leak, because the body is never
 * read) for one that has to be enforced (nothing SECRET from the body can
 * leak).
 *
 * So this is the test for the thing that replaced the guarantee. It is not
 * defending against Google, which does not echo keys back. It is defending
 * against every upstream we have not met yet, and against the day somebody
 * points this helper at one that does.
 */

const KEYS = [
  "GOOGLE_PLACES_API_KEY",
  "GOOGLE_ROUTES_API_KEY",
  "LITEAPI_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_MAPTILER_KEY",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("redactSecrets", () => {
  it("removes a credential an upstream quoted back", () => {
    process.env.GOOGLE_PLACES_API_KEY = "AIzaSyD-ThisIsNotARealKey-000000000000";
    const said = redactSecrets(
      "API key AIzaSyD-ThisIsNotARealKey-000000000000 is not authorised for this API.",
    );
    expect(said).not.toContain("AIzaSyD-ThisIsNotARealKey-000000000000");
    expect(said).toContain("[redacted]");
  });

  it("removes every one of them, not just the first", () => {
    process.env.LITEAPI_KEY = "liteapi-secret-value-aaaa";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret-bbbb";
    const said = redactSecrets(
      "liteapi-secret-value-aaaa and service-role-secret-bbbb and liteapi-secret-value-aaaa again",
    );
    expect(said).not.toContain("liteapi-secret-value-aaaa");
    expect(said).not.toContain("service-role-secret-bbbb");
  });

  /*
   * A short value is skipped on purpose. Redaction is a blind string replace,
   * and a two character "key" would blank out fragments of ordinary English in
   * every message that passed through. The floor is eight characters, which no
   * real credential is under and no accidental substring reaches.
   */
  it("ignores a value too short to be a credential", () => {
    process.env.LITEAPI_KEY = "abc";
    expect(redactSecrets("abc is a normal word fragment in abcdef")).toBe(
      "abc is a normal word fragment in abcdef",
    );
  });

  it("leaves an ordinary refusal completely alone", () => {
    process.env.GOOGLE_PLACES_API_KEY = "AIzaSyD-ThisIsNotARealKey-000000000000";
    const said =
      "Places API (New) has not been used in project 12345 before or it is disabled.";
    expect(redactSecrets(said)).toBe(said);
  });

  it("is a no-op when nothing is configured", () => {
    expect(redactSecrets("places.googleapis.com answered 403")).toBe(
      "places.googleapis.com answered 403",
    );
  });
});

/* ------------------------------------------------------------- key shapes */

describe("liteapiKeyShapeNote", () => {
  it("says nothing when there is no key at all", async () => {
    delete process.env.LITEAPI_KEY;
    const { liteapiKeyShapeNote } = await import("./providers/liteapi");
    expect(liteapiKeyShapeNote()).toBeNull();
  });

  /*
   * It speaks even when the key is fine, and that is the point. Returning null
   * on a good key meant an empty `notes` beside a 401 could mean either "the
   * shape is right" or "this deploy predates the check", and silence that could
   * mean either reads as a clean bill of health.
   */
  it("names a sandbox private key and what a 401 on one implies", async () => {
    process.env.LITEAPI_KEY = "sand_00000000-1111-2222-3333-444444444444";
    const { liteapiKeyShapeNote } = await import("./providers/liteapi");
    const note = liteapiKeyShapeNote() ?? "";
    expect(note).toContain("sandbox");
    expect(note).toContain("right shape");
    expect(note).toContain("regenerate");
  });

  it("names a production private key the same way", async () => {
    process.env.LITEAPI_KEY = "prod_00000000-1111-2222-3333-444444444444";
    const { liteapiKeyShapeNote } = await import("./providers/liteapi");
    const note = liteapiKeyShapeNote() ?? "";
    expect(note).toContain("production");
    expect(note).toContain("right shape");
  });

  /* A prefix is one of two published constants naming an environment, not a
     credential. The body of the key must never appear. */
  it("reports the prefix without the key behind it", async () => {
    process.env.LITEAPI_KEY = "sand_secret-body-that-must-not-appear";
    const { liteapiKeyShapeNote } = await import("./providers/liteapi");
    expect(liteapiKeyShapeNote() ?? "").not.toContain("secret-body-that-must-not-appear");
  });

  it("names the public-key mistake when the prefix is missing", async () => {
    process.env.LITEAPI_KEY = "00000000-1111-2222-3333-444444444444";
    const { liteapiKeyShapeNote } = await import("./providers/liteapi");
    const note = liteapiKeyShapeNote();
    expect(note).toContain("private key");
  });

  /* The note is a diagnostic, so it must never carry the thing it is about. */
  it("never quotes the key", async () => {
    process.env.LITEAPI_KEY = "public-key-value-that-should-never-appear";
    const { liteapiKeyShapeNote } = await import("./providers/liteapi");
    expect(liteapiKeyShapeNote() ?? "").not.toContain("public-key-value-that-should-never-appear");
  });
});
