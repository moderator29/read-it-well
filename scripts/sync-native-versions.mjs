#!/usr/bin/env node
/**
 * Sync the Android and iOS version numbers from `apps/web/package.json`.
 *
 * WHY THIS EXISTS
 *
 * Both stores want two numbers per release and they mean different things. The
 * marketing version is the one a person reads on a store page. The build number
 * is an integer nobody ever sees, and it is the one with teeth: Play refuses an
 * upload whose `versionCode` is not strictly higher than the last one it
 * accepted, and App Store Connect refuses a build whose `CFBundleVersion` has
 * been used before inside the same marketing version. Both refusals arrive at
 * the end of a build, after the signing, after the upload, and both cost the
 * whole cycle.
 *
 * Left alone, those four numbers live in three files: `apps/web/package.json`,
 * `apps/web/android/app/build.gradle` and the Xcode project. Three hand edited
 * numbers drift, and the way the drift is found is a rejection notice. So there
 * is one source of truth, `version` in `apps/web/package.json`, and this script
 * is the only thing that writes the other two.
 *
 * HOW THE BUILD NUMBER IS DERIVED
 *
 *     versionCode = (major * 10000 + minor * 100 + patch) * 1000 + build
 *
 * and the same integer is written to iOS as `CURRENT_PROJECT_VERSION`, so there
 * is one number to hold in your head rather than two that have to be reconciled
 * when something goes wrong in the field.
 *
 * It reads left to right, which matters when somebody is staring at it in a
 * console at midnight: 0.1.0 build 0 is 100000, 0.1.0 build 7 is 100007, 0.2.0
 * build 0 is 200000, 1.0.0 build 0 is 10000000. Raising the version raises the
 * code, always, which is the property Play actually enforces. The `build` slot
 * is what lets the same marketing version ship twice, which happens every time
 * a submission is rejected for something that is not a code change.
 *
 * `build` comes from the environment rather than from a counter in the
 * repository, because a counter in the repository is a merge conflict on every
 * parallel release branch and it lies the moment somebody builds twice without
 * committing. Continuous integration already holds a monotonic number:
 *
 *     RENTME_BUILD=$BUILD_NUMBER          # generic
 *     RENTME_BUILD=$PROJECT_BUILD_NUMBER  # Codemagic
 *     RENTME_BUILD=$GITHUB_RUN_NUMBER     # GitHub Actions
 *
 * Unset, it is 0, which is right for the first build of a version and for every
 * local build that is never going to be uploaded.
 *
 * THE RELEASE PROCEDURE
 *
 *  1. Decide the marketing version and set it in `apps/web/package.json`.
 *     Semver, and the number a person will read. Nothing else changes.
 *  2. `RENTME_BUILD=<ci build number> npm run sync:versions` from the
 *     repository root. It prints the before and after for all four values.
 *  3. Commit the result. The two native files are a record of what was built,
 *     which is what makes it possible to answer "which commit is that crash
 *     in" from a store console six weeks later.
 *  4. `CAPACITOR_SERVER_URL=https://rentme.ng npx cap sync` from `apps/web`.
 *     The origin has to be in the environment of the shell that runs the sync,
 *     for the reason `capacitor.config.ts` gives.
 *  5. Build and upload. Android needs `android/keystore.properties` present or
 *     the artefact comes out unsigned on purpose. iOS needs the Associated
 *     Domains capability on the App ID, see `ios/App/App/App.entitlements`.
 *  6. If the store rejects the submission and a second attempt is needed with
 *     no code change, raise RENTME_BUILD and run step 2 again. Do not touch
 *     the marketing version.
 *
 * `npm run sync:versions -- --check` writes nothing and exits non-zero when the
 * native files disagree with the manifest. That is the form for a pipeline: it
 * turns a silent drift into a failed build rather than a rejected upload.
 *
 * SAFETY
 *
 * The script refuses to lower a `versionCode`. Once a code has been uploaded it
 * is spent for ever, and the usual way to burn one is a mistaken edit to the
 * manifest that walks the version backwards. `--force` overrides it, and the
 * only honest reason to reach for that is a code that was never uploaded.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const manifestPath = join(repoRoot, "apps", "web", "package.json");
const gradlePath = join(repoRoot, "apps", "web", "android", "app", "build.gradle");
const pbxprojPath = join(
  repoRoot,
  "apps",
  "web",
  "ios",
  "App",
  "App.xcodeproj",
  "project.pbxproj",
);

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const force = args.has("--force");

if (args.has("--help") || args.has("-h")) {
  /* The header above is the documentation, so print it rather than keeping a
     second copy that will disagree with it. */
  const source = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const header = source.slice(source.indexOf("/**") + 3, source.indexOf("*/"));
  process.stdout.write(`${header.replace(/^ ?\* ?/gm, "")}\n`);
  process.exit(0);
}

/** Anything that stops the run, said in one voice. */
function fail(message) {
  process.stderr.write(`sync-native-versions: ${message}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------- the source */

/** @type {{ version?: unknown }} */
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  fail(`could not read ${manifestPath}: ${String(error)}`);
}

const marketingVersion = typeof manifest.version === "string" ? manifest.version.trim() : "";
const semver = /^(\d+)\.(\d+)\.(\d+)$/.exec(marketingVersion);
if (!semver) {
  fail(
    `apps/web/package.json version is "${marketingVersion}". It has to be exactly ` +
      `major.minor.patch, because both stores treat anything else as a different ` +
      `release line and a suffix like -beta cannot be encoded into an integer ` +
      `build number at all.`,
  );
}

const major = Number(semver[1]);
const minor = Number(semver[2]);
const patch = Number(semver[3]);

/*
 * The ceiling is Play's, not ours. `versionCode` is a signed 32-bit integer and
 * Play caps it at 2100000000, so the widest this encoding can go is major 209
 * with minor and patch at 99 and build at 999. Checked rather than assumed,
 * because the failure is an upload rejected for a reason that does not name the
 * arithmetic.
 */
const rawBuild = (process.env.RENTME_BUILD ?? "0").trim();
if (!/^\d+$/.test(rawBuild)) {
  fail(`RENTME_BUILD is "${rawBuild}". It has to be a whole number, or unset for 0.`);
}
const build = Number(rawBuild);
if (build > 999) fail(`RENTME_BUILD is ${build}. The build slot holds 0 to 999.`);
if (minor > 99 || patch > 99) {
  fail(`version ${marketingVersion} exceeds the two digits this encoding gives minor and patch.`);
}
if (major > 209) {
  fail(`version ${marketingVersion} exceeds Play's ceiling of 2100000000 for versionCode.`);
}

const versionCode = (major * 10000 + minor * 100 + patch) * 1000 + build;

/* --------------------------------------------------------------- the reads */

const gradle = readFileSync(gradlePath, "utf8");
const pbxproj = readFileSync(pbxprojPath, "utf8");

const gradleCode = /^(\s*versionCode\s+)(\d+)\s*$/m.exec(gradle);
const gradleName = /^(\s*versionName\s+")([^"]*)("\s*)$/m.exec(gradle);
if (!gradleCode || !gradleName) {
  fail(
    `could not find versionCode and versionName in ${gradlePath}. Somebody has ` +
      `reformatted the file, and this script is the only thing that should be ` +
      `writing those two lines.`,
  );
}

const pbxMarketing = [...pbxproj.matchAll(/MARKETING_VERSION = ([^;]+);/g)];
const pbxCurrent = [...pbxproj.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)];
if (pbxMarketing.length === 0 || pbxCurrent.length === 0) {
  fail(
    `could not find MARKETING_VERSION and CURRENT_PROJECT_VERSION in ${pbxprojPath}. ` +
      `Info.plist reads both through those build settings, so if they are gone the ` +
      `plist is resolving to nothing.`,
  );
}

const before = {
  androidVersionCode: gradleCode[2],
  androidVersionName: gradleName[2],
  /*
   * Every build configuration in the Xcode project carries its own copy of both
   * settings, Debug and Release, and they are meant to agree. Collapsing them
   * through a Set means the usual case prints one value and compares as one
   * value, while a project whose configurations have drifted apart prints both
   * and is visible rather than averaged away.
   */
  iosMarketingVersion: [...new Set(pbxMarketing.map((m) => m[1].trim()))].join(", "),
  iosBuildNumber: [...new Set(pbxCurrent.map((m) => m[1].trim()))].join(", "),
};

const after = {
  androidVersionCode: String(versionCode),
  androidVersionName: marketingVersion,
  iosMarketingVersion: marketingVersion,
  iosBuildNumber: String(versionCode),
};

/* --------------------------------------------------------------- the guard */

const previousCode = Number(before.androidVersionCode);
if (!force && Number.isFinite(previousCode) && versionCode < previousCode) {
  fail(
    `refusing to move versionCode backwards, from ${previousCode} to ${versionCode}. ` +
      `A code that has been uploaded to Play is spent for ever and the store will ` +
      `reject everything at or below it. Raise the version in ` +
      `apps/web/package.json, or pass --force if this code was never uploaded.`,
  );
}

/* --------------------------------------------------------------- the write */

const drifted = Object.keys(after).filter((key) => before[key] !== after[key]);

const rows = [
  ["android versionName", before.androidVersionName, after.androidVersionName],
  ["android versionCode", before.androidVersionCode, after.androidVersionCode],
  ["ios CFBundleShortVersionString", before.iosMarketingVersion, after.iosMarketingVersion],
  ["ios CFBundleVersion", before.iosBuildNumber, after.iosBuildNumber],
];
const width = Math.max(...rows.map(([label]) => label.length));
for (const [label, was, now] of rows) {
  const mark = was === now ? " " : "*";
  process.stdout.write(`${mark} ${label.padEnd(width)}  ${was}  ->  ${now}\n`);
}
process.stdout.write(
  `\n  source        apps/web/package.json version ${marketingVersion}\n` +
    `  build slot    RENTME_BUILD=${build}${process.env.RENTME_BUILD ? "" : " (unset, defaulted)"}\n`,
);

if (checkOnly) {
  if (drifted.length > 0) {
    process.stderr.write(
      `\nsync-native-versions: the native projects do not match the manifest. ` +
        `Run npm run sync:versions and commit the result.\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`\n  in sync\n`);
  process.exit(0);
}

if (drifted.length === 0) {
  process.stdout.write(`\n  already in sync, nothing written\n`);
  process.exit(0);
}

const nextGradle = gradle
  .replace(/^(\s*versionCode\s+)\d+\s*$/m, `$1${versionCode}`)
  .replace(/^(\s*versionName\s+")[^"]*("\s*)$/m, `$1${marketingVersion}$2`);

const nextPbxproj = pbxproj
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${marketingVersion};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${versionCode};`);

writeFileSync(gradlePath, nextGradle);
writeFileSync(pbxprojPath, nextPbxproj);

process.stdout.write(
  `\n  written       apps/web/android/app/build.gradle\n` +
    `                apps/web/ios/App/App.xcodeproj/project.pbxproj\n`,
);
