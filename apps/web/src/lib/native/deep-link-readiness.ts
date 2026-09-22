/**
 * Are the deep link association files real yet?
 *
 * THE FAILURE THIS EXISTS TO MAKE LOUD. `public/.well-known/assetlinks.json`
 * carries two placeholder SHA-256 fingerprints and
 * `public/.well-known/apple-app-site-association` carries
 * `PLACEHOLDER_REPLACE_WITH_APPLE_TEAM_ID`. Both files are SERVED, so they
 * look like they work; neither can verify, so no universal link and no app
 * link has ever fired. That also means the OAuth callback cannot be handed
 * back to the application, which means Continue with Google cannot complete
 * on the native shell, which is a 2.1 refusal on its own.
 *
 * The real values are the founder's: the Team ID from Apple Developer
 * membership details, the Play app signing SHA-256 from Play Console and the
 * upload key SHA-256 from his keystore. NOTHING HERE CAN INVENT THEM. What
 * this module does is make sure that shipping without them is noisy rather
 * than silent, which is the whole of the instruction: a placeholder must not
 * reach a binary with every check green.
 *
 * WHY A PURE FUNCTION AND NOT A SCRIPT THAT READS THE DISK. Because the same
 * answer is wanted in two places with different consequences. `scripts/
 * check-deep-links.mjs` exits non-zero before a native build, which is the
 * gate. The test beside this file proves the RULE rather than today's state,
 * so the suite stays green while the placeholders are legitimately still
 * there and goes red the moment somebody weakens the rule itself.
 */

export type DeepLinkProblem = {
  file: "apple-app-site-association" | "assetlinks.json";
  what: string;
  whoSuppliesIt: string;
};

/** A fingerprint is 32 uppercase hex pairs joined by colons. */
const SHA256_FINGERPRINT = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/** An Apple Team ID is ten alphanumeric characters, and never an email. */
const TEAM_ID = /^[0-9A-Z]{10}$/;

/**
 * Everything wrong with the two files, as a list rather than a boolean.
 *
 * `aasa` and `assetlinks` are the parsed contents. Anything unparseable is
 * itself a problem, so a caller passes `null` and gets told.
 */
export function deepLinkProblems(
  aasa: unknown,
  assetlinks: unknown,
): DeepLinkProblem[] {
  const problems: DeepLinkProblem[] = [];

  const appIDs = readAppIDs(aasa);
  if (appIDs === null) {
    problems.push({
      file: "apple-app-site-association",
      what: "the file could not be read as applinks.details[].appIDs",
      whoSuppliesIt: "fix the file",
    });
  } else if (appIDs.length === 0) {
    problems.push({
      file: "apple-app-site-association",
      what: "no appIDs at all, so nothing can be associated",
      whoSuppliesIt: "fix the file",
    });
  } else {
    for (const appID of appIDs) {
      const teamID = appID.split(".")[0] ?? "";
      if (!TEAM_ID.test(teamID)) {
        problems.push({
          file: "apple-app-site-association",
          what: `"${teamID}" is not an Apple Team ID (ten alphanumeric characters)`,
          whoSuppliesIt:
            "the founder, from Apple Developer, Membership details, or beside the selected team in Xcode Signing and Capabilities. It is not the Apple ID email and not the bundle identifier.",
        });
      }
    }
  }

  const fingerprints = readFingerprints(assetlinks);
  if (fingerprints === null) {
    problems.push({
      file: "assetlinks.json",
      what: "the file could not be read as [].target.sha256_cert_fingerprints",
      whoSuppliesIt: "fix the file",
    });
  } else if (fingerprints.length < 2) {
    problems.push({
      file: "assetlinks.json",
      what: `${fingerprints.length} fingerprint(s), and both the Play app signing key and the upload key are needed`,
      whoSuppliesIt:
        "the founder. Leaving either one out is the failure people spend a day on: the app signing key is the one that matters on a shipped install, the upload key is the one that matters on anything he side-loads.",
    });
  }
  for (const fingerprint of fingerprints ?? []) {
    if (!SHA256_FINGERPRINT.test(fingerprint)) {
      problems.push({
        file: "assetlinks.json",
        what: `"${truncate(fingerprint)}" is not a SHA-256 fingerprint (32 uppercase hex pairs separated by colons)`,
        whoSuppliesIt:
          "the founder: Play Console, the app, Release, Setup, App signing for the app signing key, and `keytool -list -v -keystore upload-keystore.jks -alias upload` for the upload key.",
      });
    }
  }

  return problems;
}

/**
 * THE OTHER HALF OF THE SAME FIX. Even with real values, Google sign-in does
 * not survive the native shell unless the callback path is handed to the
 * application. This checks that the AASA includes `/auth/callback*` BEFORE it
 * excludes the rest of `/auth/*`, because an AASA components array is read in
 * order and the wrong order is indistinguishable from the right one by eye.
 */
export function oauthCallbackIsClaimed(aasa: unknown): boolean {
  const components = readComponents(aasa);
  if (components === null) return false;
  const include = components.findIndex(
    (c) => c.path.startsWith("/auth/callback") && !c.exclude,
  );
  if (include === -1) return false;
  const exclude = components.findIndex((c) => c.path === "/auth/*" && c.exclude);
  /* No blanket exclusion is fine. One that comes first is not. */
  return exclude === -1 || include < exclude;
}

function truncate(value: string): string {
  return value.length > 48 ? `${value.slice(0, 45)}...` : value;
}

function readAppIDs(aasa: unknown): string[] | null {
  const details = readDetails(aasa);
  if (details === null) return null;
  const ids: string[] = [];
  for (const detail of details) {
    const raw = (detail as { appIDs?: unknown }).appIDs;
    if (!Array.isArray(raw)) continue;
    for (const id of raw) if (typeof id === "string") ids.push(id);
  }
  return ids;
}

function readComponents(
  aasa: unknown,
): { path: string; exclude: boolean }[] | null {
  const details = readDetails(aasa);
  if (details === null) return null;
  const out: { path: string; exclude: boolean }[] = [];
  for (const detail of details) {
    const raw = (detail as { components?: unknown }).components;
    if (!Array.isArray(raw)) continue;
    for (const component of raw) {
      if (component === null || typeof component !== "object") continue;
      const path = (component as Record<string, unknown>)["/"];
      if (typeof path !== "string") continue;
      out.push({
        path,
        exclude: (component as Record<string, unknown>).exclude === true,
      });
    }
  }
  return out;
}

function readDetails(aasa: unknown): unknown[] | null {
  if (aasa === null || typeof aasa !== "object") return null;
  const applinks = (aasa as Record<string, unknown>).applinks;
  if (applinks === null || typeof applinks !== "object") return null;
  const details = (applinks as Record<string, unknown>).details;
  return Array.isArray(details) ? details : null;
}

function readFingerprints(assetlinks: unknown): string[] | null {
  if (!Array.isArray(assetlinks)) return null;
  const out: string[] = [];
  for (const statement of assetlinks) {
    if (statement === null || typeof statement !== "object") continue;
    const target = (statement as Record<string, unknown>).target;
    if (target === null || typeof target !== "object") continue;
    const raw = (target as Record<string, unknown>).sha256_cert_fingerprints;
    if (!Array.isArray(raw)) continue;
    for (const f of raw) if (typeof f === "string") out.push(f);
  }
  return out;
}
