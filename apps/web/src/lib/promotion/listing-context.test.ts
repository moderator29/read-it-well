import { describe, expect, it } from "vitest";
import { promotionListingFrom } from "./listing-context";

/** Promotion's first run reads its listing only from the screen it was opened in front of. */
const ID = "00000000-0000-4000-8000-0000000000aa";

describe("the listing promotion's first run was opened from", () => {
  it("is the id in the listing's promotion screen, as the gate hands it over", () => {
    expect(promotionListingFrom(`/agent/listings/${ID}/promotion`)).toBe(ID);
    expect(promotionListingFrom(`/agent/listings/${ID}/promotion?x=1`)).toBe(ID);
    expect(promotionListingFrom(`/agent/listings/${ID.toUpperCase()}/promotion`)).toBe(ID);
  });

  it("is no listing for anything else: the run then says what it would show", () => {
    for (const next of [null, undefined, "", "/agent/listings", `/agent/listings/${ID}`, `/agent/listings/${ID}/status`, "/agent/listings/abc/promotion", `https://evil.example/agent/listings/${ID}/promotion`, `/x/agent/listings/${ID}/promotion`]) {
      expect(promotionListingFrom(next), String(next)).toBeNull();
    }
  });
});
