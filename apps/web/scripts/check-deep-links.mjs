#!/usr/bin/env node
/**
 * THE GATE THAT REFUSES A PLACEHOLDER.
 *
 * Run this before any native build. It exits 1, loudly, while
 * `public/.well-known/apple-app-site-association` still carries a placeholder
 * Team ID or `public/.well-known/assetlinks.json` still carries a placeholder
 * fingerprint, and it names who supplies each missing value and where he gets
 * it from.
 *
 * WHY THIS EXISTS RATHER THAN A UNIT TEST THAT FAILS TODAY. The real values
 * are the founder's, from his signing keystore and his developer account, and
 * they are not in this repository yet. A unit test that went red now would
 * either be skipped within a day or would make the whole suite red for a week,
 * and a permanently red suite is a suite nobody reads. So the RULE is tested
 * (`src/lib/native/deep-link-readiness.test.ts`, which proves the checker
 * refuses placeholders) and the STATE is gated here, at the one moment it
 * matters: the moment a binary is about to be made.
 *
 * WIRE IT IN: `npm run check:deep-links` before `npx cap sync`. It is also
 * safe to run at any time; a green run means universal links and app links
 * can verify, and that Continue with Google can complete on the native shell.
 *
 * `--warn` downgrades the exit code to 0 and still prints everything, for a
 * web-only deployment where the association files are served but no binary is
 * being cut.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const wellKnown = join(here, "..", "public", ".well-known");

/* The checker is TypeScript, so it is re-stated here rather than imported: a
   build gate that needs a compile step before it can run is a build gate that
   gets taken out of the build. The rules are identical and the test in
   `src/lib/native/deep-link-readiness.test.ts` holds both to the same shape. */
const SHA256_FINGERPRINT = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const TEAM_ID = /^[0-9A-Z]{10}$/;

const problems = [];

function readJson(name) {
  try {
    return JSON.parse(readFileSync(join(wellKnown, name), "utf8"));
  } catch (error) {
    problems.push({
      file: name,
      what: `could not be read or parsed: ${error.message}`,
      who: "fix the file",
    });
    return null;
  }
}

const aasa = readJson("apple-app-site-association");
const assetlinks = readJson("assetlinks.json");

const appIDs = (aasa?.applinks?.details ?? []).flatMap((d) => d?.appIDs ?? []);
if (aasa && appIDs.length === 0) {
  problems.push({
    file: "apple-app-site-association",
    what: "no appIDs at all, so nothing can be associated",
    who: "fix the file",
  });
}
for (const appID of appIDs) {
  const teamID = String(appID).split(".")[0] ?? "";
  if (!TEAM_ID.test(teamID)) {
    problems.push({
      file: "apple-app-site-association",
      what: `"${teamID}" is not an Apple Team ID (ten alphanumeric characters)`,
      who: "THE FOUNDER: Apple Developer, Membership details, or beside the selected team in Xcode, Signing and Capabilities. It is not the Apple ID email and not the bundle identifier.",
    });
  }
}

/* The callback include, and its ORDER, which is the half that decides whether
   Continue with Google can complete. An AASA components array is read in
   order, so an include after a blanket exclusion never runs. */
if (aasa) {
  const components = (aasa.applinks?.details ?? []).flatMap((d) => d?.components ?? []);
  const include = components.findIndex(
    (c) => typeof c?.["/"] === "string" && c["/"].startsWith("/auth/callback") && c.exclude !== true,
  );
  const exclude = components.findIndex((c) => c?.["/"] === "/auth/*" && c.exclude === true);
  if (include === -1) {
    problems.push({
      file: "apple-app-site-association",
      what: "/auth/callback* is not included, so the OAuth return goes to the in-app tab and Continue with Google cannot complete",
      who: "a code fix, not a founder value. See src/lib/native/deep-links.ts.",
    });
  } else if (exclude !== -1 && exclude < include) {
    problems.push({
      file: "apple-app-site-association",
      what: "/auth/* is excluded BEFORE /auth/callback* is included, and order decides, so the include never runs",
      who: "a code fix: move the include above the exclusion.",
    });
  }
}

const fingerprints = (Array.isArray(assetlinks) ? assetlinks : []).flatMap(
  (s) => s?.target?.sha256_cert_fingerprints ?? [],
);
if (assetlinks && fingerprints.length < 2) {
  problems.push({
    file: "assetlinks.json",
    what: `${fingerprints.length} fingerprint(s). Both the Play app signing key and the upload key are needed.`,
    who: "THE FOUNDER. Leaving either one out is the failure people spend a day on.",
  });
}
for (const fingerprint of fingerprints) {
  if (!SHA256_FINGERPRINT.test(String(fingerprint))) {
    problems.push({
      file: "assetlinks.json",
      what: `"${String(fingerprint).slice(0, 45)}" is not a SHA-256 fingerprint (32 uppercase hex pairs separated by colons)`,
      who: "THE FOUNDER: Play Console, the app, Release, Setup, App signing, for the app signing key; `keytool -list -v -keystore upload-keystore.jks -alias upload` for the upload key.",
    });
  }
}

const warnOnly = process.argv.includes("--warn");

if (problems.length === 0) {
  console.log("Deep links: both association files are real. Universal links and app links can verify.");
  process.exit(0);
}

console.error("");
console.error("=========================================================================");
console.error(" DEEP LINKS ARE DEAD, AND A BINARY MUST NOT BE CUT IN THIS STATE.");
console.error("=========================================================================");
console.error("");
console.error(" Every one of these is SERVED and looks like it works. None of them can");
console.error(" verify. And while they cannot verify, the OAuth callback is never handed");
console.error(" back to the application, so Continue with Google returns a reviewer to a");
console.error(" signed-out app. That is an App Store 2.1 refusal on its own.");
console.error("");
for (const problem of problems) {
  console.error(` ${problem.file}`);
  console.error(`   what:  ${problem.what}`);
  console.error(`   whose: ${problem.who}`);
  console.error("");
}
console.error(" The full list of what the founder supplies is in");
console.error(" docs/archive/BUILD_07_LEDGER.md section 5 and");
console.error(" docs/research/STORE_REJECTION_RISK_RESEARCH.md Part F.");
console.error("");

process.exit(warnOnly ? 0 : 1);
