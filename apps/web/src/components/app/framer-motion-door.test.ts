/**
 * framer-motion reaches the product as hooks and nothing else (D39, D49.1).
 *
 * D49.1 removed `MotionProvider`: it mounted `LazyMotion` with `domAnimation`
 * around every route while zero `m` elements existed, so the provider and
 * its feature chunk were paid for on every route and used by nothing. The
 * ported components drive `useMotionValue`, `useTransform` and `animate`,
 * which need no feature bundle.
 *
 * This census keeps it that way: no `LazyMotion`, no feature bundle, no `m`
 * element and no top-level `motion` import anywhere in the product, and the
 * root layout mounts no motion provider. If an `m` element is ever genuinely
 * wanted, `LazyMotion` comes back with it, and this test is changed in the
 * same commit with the reason.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..");

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const FILES = sources(SRC).map((path) => ({ path: path.slice(SRC.length + 1), text: readFileSync(path, "utf8") }));

function offenders(pattern: RegExp): string[] {
  return FILES.filter((file) => pattern.test(file.text)).map((file) => file.path);
}

describe("the framer-motion door", () => {
  it("reads a believable number of source files", () => {
    expect(FILES.length).toBeGreaterThan(500);
  });

  it("mounts no LazyMotion and loads no feature bundle", () => {
    expect(offenders(/<LazyMotion\b|\bdomAnimation\b|\bdomMax\b/)).toEqual([]);
    expect(existsSync(join(SRC, "components", "app", "MotionProvider.tsx"))).toBe(false);
    expect(existsSync(join(SRC, "components", "app", "motion-features.ts"))).toBe(false);
  });

  it("renders no m element, which is the only thing a LazyMotion would be for", () => {
    expect(offenders(/<m\.[a-z]/)).toEqual([]);
  });

  it("puts no motion provider in the root layout", () => {
    const layout = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");
    expect(layout).not.toMatch(/MotionProvider|LazyMotion|MotionConfig/);
  });

  it("is never bypassed with the full motion component", () => {
    expect(offenders(/import\s*\{[^}]*\bmotion\b[^}]*\}\s*from\s*["']framer-motion["']/)).toEqual([]);
  });
});
