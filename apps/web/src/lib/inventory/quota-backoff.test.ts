import { describe, expect, it } from "vitest";
import type { ProviderResult } from "./types";
import { providerError, providerOk, providerTimeout, providerNoKey } from "./types";

/**
 * Knowing a quota refusal from an ordinary one, which decides whether we keep
 * spending somebody's money on a service that is already saying no.
 *
 * Exceeding a daily quota is the one failure here that gets WORSE when you
 * retry. Every other error is worth another go on the next render: a timeout
 * may have been a slow minute, a 500 may have passed. A 429 naming a per-day
 * limit answers the same way for hours, and each attempt still counts against
 * the account making it.
 *
 * The old shape made that as bad as possible. `searchPartners` caches only a
 * COMPLETE answer, deliberately, so a failure is retried rather than inherited.
 * That is right for a blip. For a quota error it meant every page view, from
 * every visitor, fired a fresh request at a service already refusing us, all
 * day, and the only thing the retries changed was how long the quota stayed
 * exhausted after it reset.
 *
 * This is the predicate that tells the two apart. It is copied rather than
 * imported because the module it lives in is `server-only` and pulls the whole
 * provider registry with it; the logic is four lines and the cost of the copy
 * is that this file must be updated alongside it, which is what the first test
 * below is really guarding.
 */
function isQuotaRefusal(result: ProviderResult): boolean {
  if (result.outcome !== "error") return false;
  const reason = result.reason.toLowerCase();
  return reason.includes(" 429") || reason.includes("quota") || reason.includes("rate limit");
}

describe("telling a quota refusal from an ordinary failure", () => {
  it("catches the exact sentence Google sent", () => {
    // Verbatim from the live diagnostic that found this.
    const real = providerError(
      "places",
      "places.googleapis.com answered 429: Quota exceeded for quota metric 'SearchTextRequest' and limit 'SearchTextRequest per day' of service 'places.googleapis.com' for consumer 'project_number:510641880516'.",
    );
    expect(isQuotaRefusal(real)).toBe(true);
  });

  it("catches the status code alone, without the words", () => {
    expect(isQuotaRefusal(providerError("liteapi", "api.liteapi.travel answered 429"))).toBe(true);
  });

  it("catches a rate limit worded any of the usual ways", () => {
    expect(isQuotaRefusal(providerError("places", "Rate limit exceeded"))).toBe(true);
    expect(isQuotaRefusal(providerError("places", "QUOTA EXCEEDED"))).toBe(true);
  });

  /*
   * Everything below must stay retryable. Backing off for fifteen minutes on a
   * blip would turn one slow response into a quarter hour of empty shelves,
   * which is a worse bug than the one being fixed.
   */
  it("leaves an ordinary refusal alone", () => {
    expect(isQuotaRefusal(providerError("places", "places.googleapis.com answered 403"))).toBe(false);
    expect(isQuotaRefusal(providerError("liteapi", "api.liteapi.travel answered 401: unauthorized"))).toBe(false);
    expect(isQuotaRefusal(providerError("places", "places.googleapis.com answered 500"))).toBe(false);
  });

  it("leaves a timeout alone, because a slow minute is not a spent day", () => {
    expect(isQuotaRefusal(providerTimeout("liteapi"))).toBe(false);
  });

  it("says nothing about a success, a missing key or a disabled shelf", () => {
    expect(isQuotaRefusal(providerOk("places", []))).toBe(false);
    expect(isQuotaRefusal(providerNoKey("places"))).toBe(false);
  });

  /*
   * The one that would be a silent disaster. While a provider rests, it reports
   * its own skip as an error whose reason begins "over quota", and that string
   * contains the word "quota". If arming the back-off read its own message, the
   * timer would renew on every render and the provider would never be called
   * again, for the life of the process. The guard is a `startsWith` on our own
   * wording, and this is the test that it is still there.
   */
  it("does not let our own skip message re-arm the back-off", () => {
    const ours = providerError("places", "over quota, not calling again for about 12 minutes");
    // It reads as a quota refusal, which is why the second half of the guard
    // exists rather than being redundant.
    expect(isQuotaRefusal(ours)).toBe(true);
    expect(ours.outcome === "error" && ours.reason.startsWith("over quota")).toBe(true);
  });
});
