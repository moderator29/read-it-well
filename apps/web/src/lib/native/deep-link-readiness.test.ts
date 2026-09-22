import { execFileSync } from "node:child_process";
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
  });

  /**
   * THE GATE IS RUN, NOT READ.
   *
   * This assertion used to be `expect(gate).toContain("process.exit(warnOnly ? 0 : 1)")`,
   * which is a string in a file and is not a verdict. The gate re-states the
   * rules in plain JavaScript rather than importing the TypeScript checker, on
   * purpose and for a good reason written in its own header, and a hand copy of
   * a rule is exactly the thing that drifts. The one assertion that could have
   * caught the drift was the one asserting the copy exists.
   *
   * So the gate is executed and its exit code is compared with the checker's
   * answer about the same two files. A gate that stops refusing a placeholder,
   * or that starts refusing a clean pair, now fails here whatever its source
   * says. The day the founder's values land, both sides go green together,
   * which is the property the original comment claimed and did not hold.
   */
  const GATE = join(__dirname, "..", "..", "..", "scripts", "check-deep-links.mjs");

  /** Run the gate over the real files and report what it did, not what it says. */
  function runGate(args: string[] = []): { status: number; output: string } {
    try {
      const stdout = execFileSync(process.execPath, [GATE, ...args], {
        stdio: "pipe",
        encoding: "utf8",
      });
      return { status: 0, output: stdout };
    } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      return {
        status: failure.status ?? -1,
        output: `${failure.stdout ?? ""}${failure.stderr ?? ""}`,
      };
    }
  }

  it("refuses, or passes, exactly as the checker's verdict says", () => {
    const clean = deepLinkProblems(aasa, assetlinks).length === 0;
    const gate = runGate();
    expect(
      gate.status,
      clean
        ? "the checker finds nothing wrong with the association files and the gate still refuses them"
        : "the checker finds a placeholder in the association files and the gate lets it through",
    ).toBe(clean ? 0 : 1);
  });

  it("names the same problems, one for one, so neither copy of the rules can drift", () => {
    /*
     * THE ASSERTION THIS REPLACED WAS `expect(gate).toContain("process.exit(warnOnly ? 0 : 1)")`,
     * which is a string in a file and is not a verdict.
     *
     * It mattered more here than it usually would. The gate RE-STATES the
     * rules in plain JavaScript rather than importing this checker, on purpose
     * and for a reason written in its own header: a build gate that needs a
     * compile step is a build gate that gets taken out of the build. A hand
     * copy of a rule is the thing that drifts, and the only test standing
     * between the two copies was one asserting that the copy existed.
     *
     * Counted and matched per file rather than merely "both unhappy". A gate
     * whose Team ID rule is loosened while the fingerprint rule still refuses
     * goes on exiting 1 on today's tree, so an exit code alone cannot see the
     * drift. The file each problem is raised against can.
     */
    const expected = deepLinkProblems(aasa, assetlinks).map((problem) => problem.file);
    const reported = [...runGate().output.matchAll(/^\s*(\S+)\n\s*what:/gm)].map(
      (match) => match[1] ?? "",
    );
    expect(reported.sort(), "the gate and the checker disagree about the association files").toEqual(
      [...expected].sort(),
    );
  });

  it("never refuses under --warn, which is the web-only deployment door", () => {
    expect(runGate(["--warn"]).status).toBe(0);
  });
});
