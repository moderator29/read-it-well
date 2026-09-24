import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import {
  abuseFilterCheck,
  deepLinksCheck,
  deleteAccountCheck,
  exampleLabelCheck,
  listingIdsIn,
  nativeStartCheck,
  privacyProcessorsCheck,
  processorsInUse,
  reportBlockCheck,
  reviewerCheck,
  STORE_CHECK_ORDER,
  summarise,
  versionsCheck,
  type StoreCopy,
  type StoreFacts,
} from "./readiness";

const copy = getDictionary("en").frontDoor.store as unknown as StoreCopy;

const facts: StoreFacts = {
  blocked_terms: 133,
  pattern_ready: true,
  report_insert_grant: true,
  report_insert_policy: true,
  block_insert_grant: true,
  block_insert_policy: true,
};

const TEAM = "ABCDE12345";
const FP = Array.from({ length: 32 }, () => "AB").join(":");
const FP2 = Array.from({ length: 32 }, () => "CD").join(":");
const aasaGood = JSON.stringify({ applinks: { details: [{ appIDs: [`${TEAM}.com.vallospaces.app`] }] } });
const linksGood = JSON.stringify([{ target: { sha256_cert_fingerprints: [FP, FP2] } }]);

describe("every check has a title and a fix, and the panel draws all nine", () => {
  it("covers the nine checks the store notes name", () => {
    expect(STORE_CHECK_ORDER).toHaveLength(9);
    for (const key of STORE_CHECK_ORDER) {
      expect(copy.checks[key].title.length).toBeGreaterThan(5);
      expect(copy.checks[key].fix.length).toBeGreaterThan(5);
    }
  });
});

describe("guideline 1.2", () => {
  it("passes a filter with terms and a pattern", () => {
    expect(abuseFilterCheck(facts, copy).state).toBe("pass");
    expect(abuseFilterCheck(facts, copy).detail).toContain("133");
  });

  it("fails the empty filter the platform shipped with, and names the fix", () => {
    const empty = abuseFilterCheck({ ...facts, blocked_terms: 0, pattern_ready: false }, copy);
    expect(empty.state).toBe("fail");
    expect(empty.fix).toContain("blocked_terms");
  });

  it("never paints an unread database green", () => {
    expect(abuseFilterCheck(null, copy).state).toBe("unknown");
    expect(reportBlockCheck(null, copy).state).toBe("unknown");
  });

  it("fails report and block when any one grant or policy is missing", () => {
    expect(reportBlockCheck(facts, copy).state).toBe("pass");
    expect(reportBlockCheck({ ...facts, block_insert_policy: false }, copy).state).toBe("fail");
  });
});

describe("the reviewer's way in", () => {
  it("fails when no reviewer credentials are configured, with the variables named", () => {
    const check = reviewerCheck({ configured: false }, copy);
    expect(check.state).toBe("fail");
    expect(check.fix).toContain("STORE_REVIEWER_EMAIL");
  });

  it("passes a reviewer who signed in, fails one who did not", () => {
    expect(reviewerCheck({ configured: true, signedIn: true }, copy).state).toBe("pass");
    const bad = reviewerCheck({ configured: true, signedIn: false, reason: "Invalid login credentials" }, copy);
    expect(bad.state).toBe("fail");
    expect(bad.detail).toContain("Invalid login credentials");
  });

  it("needs the deletion page to answer a stranger with 200, not a sign-in redirect", () => {
    expect(deleteAccountCheck(200, copy).state).toBe("pass");
    expect(deleteAccountCheck(307, copy).state).toBe("fail");
    expect(deleteAccountCheck(null, copy).state).toBe("unknown");
  });
});

describe("deep links", () => {
  it("passes real files", () => {
    expect(deepLinksCheck(aasaGood, linksGood, copy).state).toBe("pass");
  });

  it("fails a placeholder, which is what the repository ships today", () => {
    const aasa = JSON.stringify({
      applinks: { details: [{ appIDs: ["PLACEHOLDER_REPLACE_WITH_TEAM_ID.com.vallospaces.app"] }] },
    });
    const check = deepLinksCheck(aasa, linksGood, copy);
    expect(check.state).toBe("fail");
    expect(check.detail).toContain("placeholder");
  });

  it("fails one fingerprint, because Play needs the signing key and the upload key", () => {
    const one = JSON.stringify([{ target: { sha256_cert_fingerprints: [FP] } }]);
    expect(deepLinksCheck(aasaGood, one, copy).state).toBe("fail");
  });

  it("fails a file that is not JSON rather than throwing", () => {
    expect(deepLinksCheck("<html>", linksGood, copy).state).toBe("fail");
  });
});

describe("the privacy notice names what is switched on", () => {
  it("reads the processors from key presence alone", () => {
    expect(processorsInUse({ PAYSTACK_SECRET_KEY: true, SENTRY_DSN: false, ANTHROPIC_API_KEY: true })).toEqual([
      "Paystack",
      "Anthropic",
    ]);
  });

  it("fails and names a processor with a key and no mention", () => {
    const html = "<main><p>We share payments data with <strong>Paystack</strong>.</p></main>";
    const check = privacyProcessorsCheck(html, ["Paystack", "Anthropic"], copy);
    expect(check.state).toBe("fail");
    expect(check.detail).toContain("Anthropic");
    expect(check.detail).not.toContain("Paystack,");
    expect(privacyProcessorsCheck(html, ["Paystack"], copy).state).toBe("pass");
  });
});

describe("examples are labelled where a reviewer lands", () => {
  const id = "ed000000-0000-4000-8000-00000000003a";
  const html = `<a href="/listing/${id}">One bedroom shortlet</a><a href="/listing/${id}">again</a>`;

  it("finds the listing ids on a page once each", () => {
    expect(listingIdsIn(html)).toEqual([id]);
  });

  it("fails example cards without the label, passes with it, passes with none", () => {
    expect(exampleLabelCheck(html, [id], "Example listing", copy).state).toBe("fail");
    expect(exampleLabelCheck(`${html}<span>Example listing</span>`, [id], "Example listing", copy).state).toBe("pass");
    expect(exampleLabelCheck("<main></main>", [], "Example listing", copy).state).toBe("pass");
    expect(exampleLabelCheck(null, null, "Example listing", copy).state).toBe("unknown");
  });
});

describe("the app never opens on the website (V-11)", () => {
  it("passes when the shell starts on welcome and / sends the shell to its start", () => {
    const check = nativeStartCheck("/welcome", "/home-or-landing?app=1", copy);
    expect(check.state).toBe("pass");
    expect(nativeStartCheck("https://x.test/sign-in", "https://x.test/home-or-landing?app=1", copy).state).toBe("pass");
  });

  it("fails the old behaviour, where the shell got the landing page", () => {
    expect(nativeStartCheck("/", null, copy).state).toBe("fail");
    expect(nativeStartCheck("/welcome", null, copy).state).toBe("fail");
  });
});

describe("the summary never counts an unrun check as ready", () => {
  it("keeps versions as not run, with the command to run", () => {
    const check = versionsCheck(copy);
    expect(check.state).toBe("unknown");
    expect(check.fix).toContain("sync:versions");
  });

  it("counts the three states apart", () => {
    const checks = [
      abuseFilterCheck(facts, copy),
      deleteAccountCheck(307, copy),
      versionsCheck(copy),
    ];
    expect(summarise(checks)).toEqual({ pass: 1, fail: 1, unknown: 1 });
  });
});
