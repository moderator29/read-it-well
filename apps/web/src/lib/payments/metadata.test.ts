import { describe, expect, it } from "vitest";
import { metadataObject } from "./paystack";

/**
 * The bug that dropped a funding with no trace.
 *
 * Paystack echoes transaction metadata back as an OBJECT on most charges and as
 * a JSON STRING on others, and the webhook payload and the verify response do
 * not always agree with each other for the same charge. Every reader in this
 * codebase used to be a variant of
 *
 *   typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {}
 *
 * which silently answers `{}` for a stringified metadata. The webhook then found
 * no `user_id`, returned early, and the funding was dropped: no credit, no
 * error, no log line, and a 200 back to Paystack so it never retried.
 *
 * These are the cases that reader has to survive.
 */

describe("metadataObject", () => {
  it("passes a plain object through", () => {
    expect(metadataObject({ user_id: "u1", purpose: "wallet_fund" })).toEqual({
      user_id: "u1",
      purpose: "wallet_fund",
    });
  });

  it("parses metadata that arrived as a JSON STRING, which is the whole bug", () => {
    const stringified = JSON.stringify({ user_id: "u1", purpose: "wallet_fund" });
    expect(metadataObject(stringified)).toEqual({ user_id: "u1", purpose: "wallet_fund" });
    // The reader the webhook used to use, shown failing on the same input.
    const oldReader =
      typeof stringified === "object" ? (stringified as Record<string, unknown>) : {};
    expect(oldReader["user_id"]).toBeUndefined();
  });

  it("tolerates the whitespace a serialiser can leave around it", () => {
    expect(metadataObject('  {"user_id":"u1"}  ')).toEqual({ user_id: "u1" });
  });

  it("answers an empty record for everything that is not an object", () => {
    // Never throws and never returns null: callers always get something they
    // can index into, because a malformed metadata is a missing metadata, not a
    // failed payment.
    expect(metadataObject(null)).toEqual({});
    expect(metadataObject(undefined)).toEqual({});
    expect(metadataObject("")).toEqual({});
    expect(metadataObject("   ")).toEqual({});
    expect(metadataObject("not json at all")).toEqual({});
    expect(metadataObject("[1,2,3]")).toEqual({});
    expect(metadataObject([1, 2, 3])).toEqual({});
    expect(metadataObject(42)).toEqual({});
    expect(metadataObject('"just a quoted string"')).toEqual({});
  });

  it("does not throw on a truncated payload", () => {
    expect(() => metadataObject('{"user_id":')).not.toThrow();
    expect(metadataObject('{"user_id":')).toEqual({});
  });
});
