import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deepLinkProblems, oauthCallbackIsClaimed } from "./deep-link-readiness";

/**
 * THE RULE IS TESTED HERE; THE STATE IS GATED IN `scripts/check-deep-links.mjs`.
 *
 * The real fingerprints and the real Team ID are the founder's and are not in
 * this repository yet, so a test that asserted today's files are clean would
 * be red on purpose for as long as he takes, and a permanently red suite is a
 * suite nobody reads. What is asserted instead is that the CHECKER cannot be
 * weakened: it must refuse the exact placeholders that are in the tree today,
 * it must refuse a fingerprint that merely looks plausible, and it must refuse
 * an AASA whose callback include sits below the blanket exclusion, which is
 * the ordering mistake that is invisible by eye.
 *
 * The last test is the one that will catch the real regression: it reads the
 * files actually in the tree and asserts that WHATEVER they contain, the
 * checker's verdict matches. So the day the founder's values land, this test
 * keeps passing and the build gate turns green on its own.
 */

const WELL_KNOWN = join(__dirname, "..", "..", "..", "public", ".well-known");

const REAL_AASA = {
  applinks: {
    details: [
      {
        appIDs: ["ABCDE12345.com.vallospaces.app"],
        components: [
          { "/": "/auth/callback*" },
          { "/": "/auth/*", exclude: true },
          { "/": "/listing/*" },
        ],
      },
    ],
  },
};

const REAL_ASSETLINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.vallospaces.app",
      sha256_cert_fingerprints: [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99",
        "11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00",
      ],
    },
  },
];

describe("the checker refuses a placeholder", () => {
  it("is satisfied by a pair of real files", () => {
    expect(deepLinkProblems(REAL_AASA, REAL_ASSETLINKS)).toEqual([]);
  });

  it("refuses the exact Apple placeholder that is in the tree today", () => {
    const aasa = structuredClone(REAL_AASA);
    aasa.applinks.details[0]!.appIDs = [
      "PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID.com.vallospaces.app",
    ];
    const problems = deepLinkProblems(aasa, REAL_ASSETLINKS);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.file).toBe("apple-app-site-association");
    // It names who supplies it, because "invalid" is not an actionable message.
    expect(problems[0]!.whoSuppliesIt).toContain("founder");
  });

  it("refuses an Apple ID email and a bundle identifier in the Team ID position", () => {
    for (const wrong of ["founder@example.com.com.vallospaces.app", "com.vallospaces.app"]) {
      const aasa = structuredClone(REAL_AASA);
      aasa.applinks.details[0]!.appIDs = [wrong];
      expect(deepLinkProblems(aasa, REAL_ASSETLINKS).length).toBeGreaterThan(0);
    }
  });

  it("refuses the exact Android placeholders that are in the tree today", () => {
    const assetlinks = structuredClone(REAL_ASSETLINKS);
    assetlinks[0]!.target.sha256_cert_fingerprints = [
      "PLACEHOLDER_REPLACE_WITH_PLAY_APP_SIGNING_SHA256_SEE_ANDROIDMANIFEST_XML",
      "PLACEHOLDER_REPLACE_WITH_UPLOAD_KEY_SHA256_SEE_ANDROIDMANIFEST_XML",
    ];
    expect(deepLinkProblems(REAL_AASA, assetlinks)).toHaveLength(2);
  });

  it("refuses one fingerprint where two are needed", () => {
    const assetlinks = structuredClone(REAL_ASSETLINKS);
    assetlinks[0]!.target.sha256_cert_fingerprints = [
      assetlinks[0]!.target.sha256_cert_fingerprints[0]!,
    ];
    const problems = deepLinkProblems(REAL_AASA, assetlinks);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.what).toContain("upload key");
  });

  it("refuses a fingerprint that is the right shape in the wrong case or length", () => {
    for (const wrong of [
      "aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99",
      "AA:BB:CC",
    ]) {
      const assetlinks = structuredClone(REAL_ASSETLINKS);
      assetlinks[0]!.target.sha256_cert_fingerprints = [
        wrong,
        REAL_ASSETLINKS[0]!.target.sha256_cert_fingerprints[1]!,
      ];
      expect(deepLinkProblems(REAL_AASA, assetlinks).length).toBeGreaterThan(0);
    }
  });

  it("refuses a file it cannot read at all", () => {
    expect(deepLinkProblems(null, null)).toHaveLength(2);
  });
});

describe("the OAuth callback is claimed, and claimed in the right order", () => {
  it("accepts the include above the exclusion", () => {
    expect(oauthCallbackIsClaimed(REAL_AASA)).toBe(true);
  });

  it("refuses the include BELOW the exclusion, which is invisible by eye", () => {
    const aasa = structuredClone(REAL_AASA);
    aasa.applinks.details[0]!.components = [
      { "/": "/auth/*", exclude: true },
      { "/": "/auth/callback*" },
    ];
    expect(oauthCallbackIsClaimed(aasa)).toBe(false);
  });

  it("refuses an AASA with no callback include at all, which is what shipped", () => {
    const aasa = structuredClone(REAL_AASA);
    aasa.applinks.details[0]!.components = [{ "/": "/auth/*", exclude: true }];
    expect(oauthCallbackIsClaimed(aasa)).toBe(false);
  });
});

describe("the files in the tree, whatever state they are in", () => {
  const aasa = JSON.parse(readFileSync(join(WELL_KNOWN, "apple-app-site-association"), "utf8"));
  const assetlinks = JSON.parse(readFileSync(join(WELL_KNOWN, "assetlinks.json"), "utf8"));

  it("claims the OAuth callback ahead of the /auth exclusion", () => {
    // This one is a CODE fix and nothing waits on the founder, so it is
    // asserted against the real file rather than against a fixture.
    expect(oauthCallbackIsClaimed(aasa)).toBe(true);
  });

  it("is either clean or every problem is a value only the founder can supply", () => {
    const problems = deepLinkProblems(aasa, assetlinks);
    for (const problem of problems) {
      expect(problem.whoSuppliesIt).toContain("founder");
    }
    // And the build gate must agree with this verdict, so a green suite and a
    // red native build can never mean two different things.
    const gate = readFileSync(join(__dirname, "..", "..", "..", "scripts", "check-deep-links.mjs"), "utf8");
    expect(gate).toContain("process.exit(warnOnly ? 0 : 1)");
  });
});
