import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * NOTHING IN THIS REPOSITORY IS A KEY.
 *
 * WHY THIS EXISTS, WRITTEN DOWN SO THE RULE OUTLIVES THE INCIDENT. On 23
 * September a Firebase service account, private key and all, was pasted into a
 * working session so that Android push could be wired. It was never needed:
 * the deployment already held it as an environment variable, and the only
 * thing the repository needs is `google-services.json`, whose API key is a
 * public client identifier. Nothing was committed. **But "nothing was
 * committed" was a fact about attention, and attention is not a control.**
 *
 * So this is the control. It sweeps the tree for the shapes a real credential
 * takes and fails on any of them. It is a blunt instrument on purpose: a
 * pattern that misses a key fails open, which is the only failure direction
 * that matters here.
 *
 * WHAT IT DOES NOT DO, said plainly so nobody reads it as more than it is. It
 * reads the WORKING TREE, not git history, so it cannot tell you a secret was
 * committed and later removed. It knows nothing about high-entropy strings
 * that carry no marker. And it is one check in one repository, not a
 * substitute for rotating a credential that has been pasted anywhere at all.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");

/**
 * Binary and media, which carry no secrets we can read and would only slow the
 * sweep down. `.jks` is deliberately NOT here: a keystore in the tree is
 * exactly the kind of thing this should notice, and `.gitignore` refuses to
 * track one, so finding one tracked is a finding.
 */
const SKIP_EXTENSIONS = /\.(png|jpe?g|webp|gif|avif|heic|ico|svg|mp4|webm|woff2?|ttf|otf|pdf|zip|gz|lock)$/i;

/**
 * The shapes. Each one is a marker a credential format actually prints, not a
 * guess about entropy.
 */
const SECRET_SHAPES: { name: string; pattern: RegExp }[] = [
  { name: "a PEM private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: "a Google service account block", pattern: /"type"\s*:\s*"service_account"/ },
  { name: "a Google service account address", pattern: /[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com/ },
  { name: "a live Paystack secret key", pattern: /\bsk_live_[A-Za-z0-9]{10,}/ },
  { name: "a Paystack test secret key", pattern: /\bsk_test_[A-Za-z0-9]{10,}/ },
  { name: "a Resend API key", pattern: /\bre_[A-Za-z0-9]{20,}/ },
  { name: "an AWS access key id", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  /* A JWT, not the words "service role". The role NAME appears legitimately in
     prose, in policies and in comments all over this repository; what must
     never appear is a signed token. Three base64url segments after a JOSE
     header is the shape of one. */
  { name: "a signed JWT", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "a Slack token", pattern: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
];

/**
 * Files allowed to contain a shape, each with the reason. **Empty is the
 * target.** A file added here needs a sentence saying why the match is not a
 * secret, and this file's own patterns are excluded automatically because a
 * check that flags itself teaches everybody to ignore it.
 */
const ALLOWED = new Map<string, string>([
  [
    "apps/web/src/lib/observability/scrub.test.ts",
    "A fabricated sk_live_ string, and the file's whole purpose is to prove the " +
      "log scrubber redacts exactly that shape. Removing it would delete the " +
      "test that stops a real one being printed. The value is not a key: it " +
      "spells out the alphabet.",
  ],
]);

/**
 * GIT-TRACKED FILES ONLY, and that is the definition rather than an
 * optimisation. "Committed" means in the repository. `apps/web/.env.local`
 * holds real tokens and is correctly ignored; a sweep of the working tree
 * would flag it and teach everybody that this check cries wolf. `ls-files`
 * reads the index, so a file that has been `git add`ed is covered before the
 * commit that would publish it.
 */
function trackedFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
  return out
    .toString("utf8")
    .split("\0")
    .filter((rel) => rel.length > 0 && !SKIP_EXTENSIONS.test(rel));
}

const SELF = "apps/web/src/lib/security/no-committed-secrets.test.ts";
const FILES = trackedFiles();

describe("no committed secrets", () => {
  it("sweeps a real tree, so an empty sweep cannot pass as coverage", () => {
    expect(FILES.length).toBeGreaterThan(1000);
    expect(FILES).toContain("apps/web/package.json");
    expect(FILES).toContain(SELF);
  });

  it("can see a secret when there is one, which is what makes the empty result mean anything", () => {
    /* The patterns are exercised against a string rather than trusted. A
       regex that matches nothing passes the sweep below for the wrong reason. */
    const sample = [
      "-----BEGIN PRIVATE KEY-----",
      '"type": "service_account"',
      "svc@proj.iam.gserviceaccount.com",
      "sk_live_abcdefghij1234567890",
      "re_abcdefghij1234567890abcd",
      "AKIAABCDEFGHIJKLMNOP",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJlX2hlcmVfZm9yX3Rlc3Q",
      "xoxb-1234567890abcdef",
    ].join("\n");
    const hit = SECRET_SHAPES.filter((shape) => shape.pattern.test(sample)).map((s) => s.name);
    expect(hit).toHaveLength(SECRET_SHAPES.length - 1); // sk_test is the one not in the sample
    expect(hit).toContain("a PEM private key");
  });

  it("finds no credential anywhere in the working tree", () => {
    const findings: string[] = [];
    for (const rel of FILES) {
      if (rel === SELF) continue;
      if (ALLOWED.has(rel)) continue;
      const full = join(ROOT, rel);
      let text: string;
      try {
        if (statSync(full).size > 2_000_000) continue;
        text = readFileSync(full, "utf8");
      } catch {
        /* Tracked but not present: a deleted file staged for removal. */
        continue;
      }
      for (const shape of SECRET_SHAPES) {
        if (shape.pattern.test(text)) findings.push(`${rel}: ${shape.name}`);
      }
    }
    expect(findings).toEqual([]);
  });

  it("names nothing in the allow list that is not there any more", () => {
    const stale = [...ALLOWED.keys()].filter((rel) => !FILES.includes(rel));
    expect(stale).toEqual([]);
  });
});
