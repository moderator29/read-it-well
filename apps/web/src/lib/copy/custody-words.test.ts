import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES, getDictionary } from "@vallo/i18n";
import * as firstRuns from "@/components/app/feature-onboarding/first-runs";
import { GATED_ACTIONS } from "@/components/auth/auth-intent";
import { stringLiterals } from "./source-scan";

/**
 * D48: THE PRODUCT NEVER TELLS A MEMBER THAT VALLO HOLDS THEIR MONEY.
 *
 * On 6 October the experience branch shipped three first runs, "your wallet",
 * "escrow" and "withdrawals", with actions "Open my wallet" and "Open escrow",
 * in the same build as `lib/money/copy.ts` saying "Vallo never holds your
 * money". They were gated only by three keys not being mounted, so one array
 * edit would have published a screen telling a member Vallo was holding their
 * money, which ADR-0002 forbids because it is regulated custody.
 *
 * They were deleted, and this test is what keeps them deleted: it fails if any
 * of those words comes back into a dictionary, a source string, the first-run
 * registry or the sign-in intents. A first run for a provider-held balance
 * (D50) is new copy written against a live rail, not these words restored.
 */

const RETIRED_PHRASES: { label: string; pattern: RegExp }[] = [
  { label: "your wallet", pattern: /\byour wallet\b/i },
  { label: "Open my wallet", pattern: /\bopen my wallet\b/i },
  { label: "Open escrow", pattern: /\bopen escrow\b/i },
];

const RETIRED_FIRST_RUNS = ["wallet", "escrow", "withdrawal"] as const;

/**
 * The one place "your wallet" is legitimately said (D48 item 6): a guest's own
 * external crypto wallet, which Vallo never holds, on the crypto charge page.
 */
const ALLOWED: { path: RegExp; label: string }[] = [{ path: /^cryptoPay\./, label: "your wallet" }];

function leaves(value: unknown, path: string[] = [], out: { path: string; text: string }[] = []) {
  if (typeof value === "string") out.push({ path: path.join("."), text: value });
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) leaves(child, [...path, key], out);
  }
  return out;
}

function offences(items: { path: string; text: string }[]): string[] {
  const found: string[] = [];
  for (const { path, text } of items) {
    for (const { label, pattern } of RETIRED_PHRASES) {
      if (!pattern.test(text)) continue;
      if (ALLOWED.some((allow) => allow.label === label && allow.path.test(path))) continue;
      found.push(`${path}: "${label}"`);
    }
  }
  return found;
}

describe("D48: the retired custody words stay out of every dictionary", () => {
  it.each(LOCALES)("%s says nothing about a wallet, escrow or withdrawal Vallo holds", (locale) => {
    const strings = leaves(getDictionary(locale));
    expect(strings.length).toBeGreaterThan(1000);
    expect(offences(strings)).toEqual([]);
  });

  it.each(LOCALES)("%s has no wallet, escrow or withdrawal first run", (locale) => {
    const firstRun = getDictionary(locale).experienceFeatures.firstRun as Record<string, unknown>;
    for (const key of RETIRED_FIRST_RUNS) expect(Object.keys(firstRun)).not.toContain(key);
  });

  it("catches the strings that shipped, so the patterns cannot quietly stop working", () => {
    expect(
      offences([
        { path: "experienceFeatures.firstRun.wallet.name", text: "your wallet" },
        { path: "experienceFeatures.firstRun.wallet.action", text: "Open my wallet" },
        { path: "experienceFeatures.firstRun.escrow.action", text: "Open escrow" },
      ]),
    ).toHaveLength(3);
  });
});

describe("D48: the first-run registry and the sign-in intents carry no custody", () => {
  it("mounts no wallet, escrow or withdrawal first run and keeps no list waiting for one", () => {
    for (const key of RETIRED_FIRST_RUNS) {
      expect(firstRuns.MOUNTED_FIRST_RUNS as readonly string[]).not.toContain(key);
      expect(firstRuns.isMountedFirstRun(key)).toBe(false);
    }
    expect(Object.keys(firstRuns)).not.toContain("WAITING_FIRST_RUNS");
  });

  it("names no first-run home under a wallet or escrow route", () => {
    for (const home of Object.values(firstRuns.FIRST_RUN_HOME)) {
      expect(home).not.toMatch(/\/(wallet|escrow|withdraw)/);
    }
  });

  it("refuses wallet as a sign-in intent", () => {
    expect(GATED_ACTIONS as readonly string[]).not.toContain("wallet");
  });
});

/* The same phrases as string literals and JSX text in the app's own source, so
   a hard-coded line cannot bring them back around the dictionary. Comments are
   ignored: a comment that records why the words were removed is not a screen. */
const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}

describe("D48: no source string says it either", () => {
  it(
    "finds none of the retired phrases in a string literal under src",
    () => {
      const files = sourceFiles(SRC);
      expect(files.length).toBeGreaterThan(200);
      const found: string[] = [];
      for (const file of files) {
        for (const { line, text } of stringLiterals(readFileSync(file, "utf8"))) {
          for (const { label, pattern } of RETIRED_PHRASES) {
            if (pattern.test(text)) found.push(`${relative(SRC, file)}:${line}: "${label}"`);
          }
        }
      }
      expect(found).toEqual([]);
    },
    30_000,
  );
});
