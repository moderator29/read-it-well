import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every environment variable the application reads is documented in both
 * places an operator looks: the one template (`apps/web/.env.example`) and the
 * operator's reference (`docs/ENVIRONMENT.md`).
 *
 * DOC-16: `ENVIRONMENT.md` had drifted to omit VAPID, the auth hook secret,
 * Yellow Card, the inspection report switch and the store and social URLs, and
 * the template omitted Yellow Card and the inspection switch. A variable that
 * is read and not documented is a capability nobody knows how to switch on.
 *
 * Names are collected from `process.env.NAME`, `process.env["NAME"]`,
 * `env.NAME` (functions that take the environment as a parameter) and the
 * `*_VAR = "NAME"` constants the push transports read through.
 */
const WEB = join(__dirname, "..", "..");
const ROOT = join(WEB, "..", "..");

/** Set by Next.js or Vercel; documented as such in ENVIRONMENT.md, never in the template. */
const PLATFORM = new Set([
  "NODE_ENV",
  "NEXT_RUNTIME",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_PROJECT_PRODUCTION_URL",
]);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

function namesRead(): Set<string> {
  const names = new Set<string>();
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]+)/g,
    /process\.env\[["']([A-Z][A-Z0-9_]+)["']\]/g,
    /\benv\.([A-Z][A-Z0-9_]{3,})\b/g,
    /_VAR\s*=\s*["']([A-Z][A-Z0-9_]+)["']/g,
  ];
  for (const file of sourceFiles(join(WEB, "src"))) {
    const text = readFileSync(file, "utf8");
    for (const re of patterns) for (const m of text.matchAll(re)) if (m[1]) names.add(m[1]);
  }
  return names;
}

const mentions = (text: string, name: string) => new RegExp(`\\b${name}\\b`).test(text);

describe("environment variables are documented", () => {
  const read = namesRead();
  const template = readFileSync(join(WEB, ".env.example"), "utf8");
  const reference = readFileSync(join(ROOT, "docs", "ENVIRONMENT.md"), "utf8");

  it("finds the variables the code reads (the scan itself works)", () => {
    for (const known of ["NEXT_PUBLIC_SUPABASE_URL", "PAYSTACK_SECRET_KEY", "VAPID_PRIVATE_KEY", "YELLOWCARD_API_KEY"]) {
      expect(read.has(known), `scan missed ${known}`).toBe(true);
    }
  });

  it("names every one in apps/web/.env.example", () => {
    const missing = [...read].filter((n) => !PLATFORM.has(n) && !mentions(template, n)).sort();
    expect(missing, `read by apps/web/src, absent from .env.example: ${missing.join(", ")}`).toEqual([]);
  });

  it("names every one in docs/ENVIRONMENT.md", () => {
    const missing = [...read].filter((n) => !mentions(reference, n)).sort();
    expect(missing, `read by apps/web/src, absent from docs/ENVIRONMENT.md: ${missing.join(", ")}`).toEqual([]);
  });

  it("keeps one template: apps/web/.env.local.example does not come back", () => {
    expect(() => statSync(join(WEB, ".env.local.example"))).toThrow();
  });
});
