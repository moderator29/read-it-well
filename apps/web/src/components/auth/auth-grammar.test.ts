import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE AUTH SCREENS SPEAK ONE GRAMMAR (R3-09).
 *
 * The audit found the ten auth pages had changed by one mechanical edit each.
 * Reading them found the screens mostly built from the Slate pieces, and four
 * places where a screen spoke its own dialect:
 *
 *   - two server refusals drawn as a hand-mixed amber box (forgot password,
 *     new password) while every other refusal is `.nf-auth__alert`, rose;
 *   - three failures drawn in the neutral notice style (`.nf-auth__notice`,
 *     which is for news, not refusals);
 *   - four field errors with their own sizes and margins in place of
 *     `.nf-slate-field__error`;
 *   - the error boundary, hand-sized, the one screen that did not look like
 *     the others; and the reset code typed into a plain field while every
 *     other code draws `CodeInput`'s cells.
 *
 * This holds the grammar: every `role="alert"` on these screens is a refusal
 * (`nf-auth__alert`) or a field error (`nf-slate-field__error`), and the
 * boundary and the reset code use the shared pieces.
 */

const SRC = join(process.cwd(), "src");
const DIRS = [join(SRC, "components", "auth"), join(SRC, "app", "(auth)")];

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sources(path, out);
    else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) out.push(path);
  }
  return out;
}

/** Each `role="alert"` element's className, with the file and line. */
function alerts(): { where: string; className: string }[] {
  const found: { where: string; className: string }[] = [];
  for (const file of DIRS.flatMap((dir) => sources(dir))) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/<\w+\b[^>]*?role="alert"[^>]*>/gs)) {
      const tag = match[0];
      const className = /className="([^"]*)"/.exec(tag)?.[1] ?? "";
      const line = text.slice(0, match.index).split("\n").length;
      found.push({ where: `${relative(SRC, file)}:${line}`, className });
    }
  }
  return found;
}

describe("the auth screens' one grammar", () => {
  it("draws every refusal and every field error with the shared classes", () => {
    const all = alerts();
    expect(all.length).toBeGreaterThan(10);
    const off = all.filter(
      ({ className }) => !/^(nf-auth__alert|nf-slate-field__error)(\s|$)/.test(className),
    );
    expect(off).toEqual([]);
  });

  it("keeps hand-mixed colours and raw type sizes out of the refusals", () => {
    for (const { where, className } of alerts()) {
      expect(className, where).not.toMatch(/color-mix|text-\[|state-warning/);
    }
  });

  it("draws the error boundary in the same pieces as every other door", () => {
    const boundary = readFileSync(join(SRC, "app", "(auth)", "error.tsx"), "utf8");
    expect(boundary).toMatch(/className="nf-auth__title"/);
    expect(boundary).toMatch(/<AuthPillButton\b/);
    expect(boundary).not.toMatch(/text-\[/);
  });

  it("takes the reset code in the same cells as every other code", () => {
    const reset = readFileSync(join(SRC, "components", "auth", "ResetCodeForm.tsx"), "utf8");
    expect(reset).toMatch(/<CodeInput\b/);
    expect(reset).not.toMatch(/tracking-\[/);
  });
});
