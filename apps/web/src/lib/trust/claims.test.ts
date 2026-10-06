import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { stringLiterals, withoutComments } from "@/lib/copy/source-scan";
import { BACKED_CLAIMS, KNOWN_UNBACKED_PENDING_REWORD, claimMatches, unbackedClaim } from "./claims";

/**
 * V-02: THE CLAIMS RULE AS A BUILD CHECK.
 *
 * Runs over every string literal and every run of JSX text a person can read:
 * the four locale catalogues and every .ts/.tsx file under apps/web/src,
 * except tests, the development previews and the staff console (app/admin,
 * lib/admin, components/admin), whose readers are staff looking at the
 * mechanism itself. Also the copy outside the app bundle: the auth emails in
 * supabase/templates (html and text), the native shell's offline page, the
 * iOS permission strings in Info.plist and the Android strings.xml. Wired
 * into `npm run lint` and `prebuild`. The English locale modules
 * (packages/i18n/src/locales/*.en.ts) are read too, since 6 October: the
 * catalogues spread them in, so their sentences were never literals in en.ts.
 */
const WEB = process.cwd();
const REPO = join(WEB, "..", "..");

/* The sentences that shipped, verbatim. Each one must fail. */
const THE_SENTENCES_THAT_SHIPPED = [
  "Verified homes, land, hotels and shortlets across Nigeria. See what you will actually pay before you call anybody, and deal with the owner directly where there is one.",
  "Rent, buy or invest in verified properties across Nigeria.",
  "Homes for real rent, priced per year. Message the agent, inspect the property, then pay. Verified listings only.",
  "Every rental here is checked",
  "Listings and agents are verified before they go live, and the whole conversation stays inside Vallo.",
  "Verified supply only",
  "Every listing is checked by hand, so the badge on your property means something to guests.",
  "Chats, inspections and payments stay on the platform, where they are protected.",
  "List properties, connect with verified guests, manage bookings and earn.",
  "Track earnings and get paid securely",
  "Secure transactions. Fair outcomes.",
  "Checked listings. Real people. Serious property.",
  "Is my money safe?",
  "Your earnings are safe and waiting.",
  "Messaging is paused for maintenance. Your conversations are safe and nothing has been lost.",
  "Sign in to continue. Your details are kept safe.",
  "Chat with the agent, arrange an inspection and keep every step of the deal in one protected place.",
  "Your name, date of birth and document numbers are checked against identity and sanctions databases through a processor.",
  "Duplicate and stolen photographs are checked before anything is published.",
  "The agent and this property were checked by Vallo before it went live.",
  "Your account is safe.",
  "Written reviews from verified stays will appear here once guests share them on Vallo.",
];

/* True sentences that must pass, one per kind of mechanism. */
const TRUE_SENTENCES = [
  "Verified",
  "Verified agent",
  "Verified only",
  "Identity verified",
  "The verified tick appears only once a person here has checked your ID, so it means something to guests.",
  "A person at Vallo checked the ID of the agent behind this listing.",
  "A secure page in naira, then straight back here. Your card details never touch Vallo.",
  "Account preferences are protected with row level security, so only you can read or change your own row.",
  "Deals made outside the platform are not protected by us.",
  "You can share a review once you have checked out.",
  "That story can no longer be taken down from here.",
  "Ownership document received, not yet checked.",
];

describe("the claims rule", () => {
  it.each(THE_SENTENCES_THAT_SHIPPED)("fails the sentence that shipped: %s", (sentence) => {
    expect(unbackedClaim(sentence)).not.toBeNull();
  });

  it.each(TRUE_SENTENCES)("passes a backed or negated sentence: %s", (sentence) => {
    expect(unbackedClaim(sentence)).toBeNull();
  });
});

/* ------------------------------------------------------------ the sweep */

function walk(dir: string, out: string[]): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") walk(path, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

const SKIPPED = /\/app\/\(dev\)\/|\/app\/admin\/|\/lib\/admin\/|\/components\/admin\/|database\.types\.ts$|\/lib\/trust\/claims\.ts$/;

/** An identifier, a column list or a cookie attribute, never copy. */
const CODE_SHAPED = /^[a-z0-9_]+$|^[a-z0-9_*]+(?:\s*,\s*[a-z0-9_*().!:]+)+$|^(?:Secure|HttpOnly|Path=\/|SameSite=\w+)$|^(?:\/[a-z0-9_\-[\]]+)+\/?$/;

type Copy = { where: string; text: string };

function copyIn(file: string): Copy[] {
  const source = readFileSync(file, "utf8");
  const rel = relative(REPO, file);
  const found: Copy[] = [];
  for (const literal of stringLiterals(source)) {
    const text = literal.text.trim();
    if (!/[A-Za-z]/.test(text) || CODE_SHAPED.test(text)) continue;
    found.push({ where: `${rel}:${literal.line}`, text });
  }
  if (file.endsWith(".tsx")) {
    const code = withoutComments(source);
    const jsxText = />([^<>{}()=;"`]*[A-Za-z][^<>{}()=;"`]*)</g;
    let match: RegExpExecArray | null;
    while ((match = jsxText.exec(code))) {
      const text = (match[1] ?? "").replace(/\s+/g, " ").trim();
      if (text) found.push({ where: `${rel}:${code.slice(0, match.index).split("\n").length}`, text });
    }
  }
  return found;
}

/* The English modules the catalogues are assembled from (passcode.en.ts,
   front-door.en.ts, trust-visible.en.ts, experience-*.en.ts and the rest).
   en.ts spreads them in, so a sentence written into a module never appears
   as a literal in en.ts: without these the module copy escaped the sweep. */
const LOCALES = join(REPO, "packages/i18n/src/locales");
const ENGLISH_MODULES = readdirSync(LOCALES)
  .filter((name) => /\.en\.ts$/.test(name))
  .sort()
  .map((name) => join(LOCALES, name));

const FILES = [
  ...walk(join(WEB, "src"), []),
  ...["en", "ha", "ig", "yo"].map((locale) => join(LOCALES, `${locale}.ts`)),
  ...ENGLISH_MODULES,
].filter((file) => !SKIPPED.test(file.split("\\").join("/")));

/** Readable text in a markup or plain-text file: element text, alt/title/aria-label, and plist/xml string values. */
function copyInMarkup(file: string): Copy[] {
  const rel = relative(REPO, file);
  const source = readFileSync(file, "utf8");
  if (file.endsWith(".txt")) {
    return source
      .split("\n")
      .map((line, index) => ({ where: `${rel}:${index + 1}`, text: line.trim() }))
      .filter((copy) => /[A-Za-z]/.test(copy.text) && !/^https?:\/\/\S+$|^\{\{[^}]*\}\}$/.test(copy.text));
  }
  const markup = source
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => m.replace(/[^\n]/g, " "));
  const found: Copy[] = [];
  const line = (index: number) => markup.slice(0, index).split("\n").length;
  const text = />([^<>]*[A-Za-z][^<>]*)</g;
  let match: RegExpExecArray | null;
  while ((match = text.exec(markup))) {
    const value = (match[1] ?? "").replace(/\s+/g, " ").trim();
    if (value && !CODE_SHAPED.test(value) && !/^\$\([A-Z_]+\)$/.test(value)) found.push({ where: `${rel}:${line(match.index)}`, text: value });
  }
  const attribute = /\b(?:alt|title|aria-label)="([^"]*[A-Za-z][^"]*)"/g;
  while ((match = attribute.exec(markup))) {
    found.push({ where: `${rel}:${line(match.index)}`, text: (match[1] ?? "").trim() });
  }
  return found;
}

const MARKUP_FILES = [
  ...readdirSync(join(REPO, "supabase/templates"))
    .filter((name) => /\.(html|txt)$/.test(name))
    .map((name) => join(REPO, "supabase/templates", name)),
  join(WEB, "native-shell/index.html"),
  join(WEB, "ios/App/App/Info.plist"),
  join(WEB, "android/app/src/main/res/values/strings.xml"),
];

const COPY = [...FILES.flatMap(copyIn), ...MARKUP_FILES.flatMap(copyInMarkup)];

/** The file part of a `where` ("path:line"), with forward slashes. */
function fileOf(copy: Copy): string {
  return copy.where.slice(0, copy.where.lastIndexOf(":")).split("\\").join("/");
}

/** Accepted only in the one file its entry names, and only for its sentence. */
function pendingReword(copy: Copy): boolean {
  return KNOWN_UNBACKED_PENDING_REWORD.some((entry) => fileOf(copy) === entry.file && entry.phrase.test(copy.text));
}

describe("every claim in the product names its mechanism", () => {
  it("reads enough of the product to mean something", () => {
    expect(FILES.length).toBeGreaterThan(800);
    expect(COPY.length).toBeGreaterThan(5000);
    expect(MARKUP_FILES.flatMap(copyInMarkup).length).toBeGreaterThan(40);
  });

  it("reads every English locale module, not only the catalogues", () => {
    expect(ENGLISH_MODULES.length).toBeGreaterThan(30);
    /* In the sweep, not filtered out: a module that has no copy yet (an
       empty namespace waiting for its owner) is still read the day it does. */
    const unread = ENGLISH_MODULES.filter((file) => !FILES.includes(file)).map((file) => relative(REPO, file));
    expect(unread, unread.join("\n")).toEqual([]);
  });

  it("finds no claim word that nothing backs", () => {
    const unbacked = COPY.map((copy) => ({ ...copy, word: unbackedClaim(copy.text) }))
      .filter((copy) => copy.word !== null)
      .filter((copy) => !pendingReword(copy))
      .map((copy) => `${copy.where}  "${copy.word}"  in: ${copy.text.slice(0, 140)}`);
    expect(unbacked, unbacked.join("\n")).toEqual([]);
  });

  /* The temporary list must shrink, never rot: an entry whose sentence has
     been reworded (or moved) fails here so it is deleted, and the list
     reaches empty as owners reword. */
  it("keeps no pending-reword entry whose sentence has gone (reworded: delete the entry)", () => {
    const gone = KNOWN_UNBACKED_PENDING_REWORD.filter(
      (entry) => !COPY.some((copy) => fileOf(copy) === entry.file && entry.phrase.test(copy.text)),
    ).map((entry) => `${entry.file}  ${String(entry.phrase)}  (owner: ${entry.owner})`);
    expect(gone, gone.join("\n")).toEqual([]);
  });

  it("holds only sentences that really are unbacked in the pending-reword list", () => {
    const backed = KNOWN_UNBACKED_PENDING_REWORD.flatMap((entry) =>
      COPY.filter((copy) => fileOf(copy) === entry.file && entry.phrase.test(copy.text) && unbackedClaim(copy.text) === null).map(
        (copy) => `${copy.where}  ${copy.text}`,
      ),
    );
    expect(backed, backed.join("\n")).toEqual([]);
  });

  it("keeps no allowlist entry that no longer matches anything", () => {
    const stale = BACKED_CLAIMS.filter((claim) => !claim.pendingRemoval)
      .filter((claim) => !COPY.some((copy) => claimMatches(claim, copy.text)))
      .map((claim) => String(claim.phrase));
    expect(stale, stale.join("\n")).toEqual([]);
  });
});
