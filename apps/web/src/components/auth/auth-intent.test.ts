import { describe, expect, it } from "vitest";
import {
  authHref,
  GATED_ACTIONS,
  isGatedAction,
  readIntent,
  returnHref,
  withoutIntent,
} from "./auth-intent";

/**
 * The gate's memory, tested directly.
 *
 * These are the two failures that make an auth gate feel broken, and neither
 * of them shows up in a screenshot: losing the filters somebody had applied,
 * and letting `?next=` walk off the site.
 */
describe("returnHref", () => {
  it("keeps the query the person was looking at", () => {
    expect(returnHref("/search", "?q=lekki&beds=2", "save")).toBe("/search?q=lekki&beds=2&do=save");
  });

  it("works from a bare path", () => {
    expect(returnHref("/listing/abc", "", "message")).toBe("/listing/abc?do=message");
  });

  it("accepts a search string with no leading question mark", () => {
    expect(returnHref("/search", "q=abuja", "save")).toBe("/search?q=abuja&do=save");
  });

  it("replaces a stale verb rather than appending a second one", () => {
    expect(returnHref("/listing/abc", "?do=save", "pay")).toBe("/listing/abc?do=pay");
  });

  it("refuses a protocol-relative path, which would leave the site", () => {
    expect(returnHref("//evil.example/x", "", "save")).toBe("/?do=save");
  });

  it("refuses an absolute URL", () => {
    expect(returnHref("https://evil.example/x", "", "save")).toBe("/?do=save");
  });

  it("refuses a bare relative path", () => {
    expect(returnHref("listing/abc", "", "save")).toBe("/?do=save");
  });
});

describe("authHref", () => {
  it("sends a browsing guest to sign up by default", () => {
    expect(authHref("/listing/abc?do=save")).toBe("/sign-up?next=%2Flisting%2Fabc%3Fdo%3Dsave");
  });

  it("can send somebody to sign in instead", () => {
    expect(authHref("/wallet?do=wallet", "sign-in")).toBe("/sign-in?next=%2Fwallet%3Fdo%3Dwallet");
  });
});

describe("readIntent", () => {
  it("reads every action it can produce", () => {
    for (const action of GATED_ACTIONS) {
      expect(readIntent(`?do=${action}`)).toBe(action);
    }
  });

  it("is null when there is no verb", () => {
    expect(readIntent("?q=lekki")).toBeNull();
  });

  it("is null rather than throwing on a verb somebody typed themselves", () => {
    expect(readIntent("?do=banana")).toBeNull();
  });

  it("accepts URLSearchParams as well as a string", () => {
    expect(readIntent(new URLSearchParams({ do: "follow" }))).toBe("follow");
  });
});

describe("withoutIntent", () => {
  it("takes the verb off and keeps everything else", () => {
    expect(withoutIntent("/search", "?q=lekki&do=save")).toBe("/search?q=lekki");
  });

  it("leaves no trailing question mark when the verb was the only parameter", () => {
    expect(withoutIntent("/listing/abc", "?do=save")).toBe("/listing/abc");
  });
});

describe("isGatedAction", () => {
  it("refuses null, empty and unknown", () => {
    expect(isGatedAction(null)).toBe(false);
    expect(isGatedAction("")).toBe(false);
    expect(isGatedAction("delete-account")).toBe(false);
  });
});
