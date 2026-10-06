/**
 * framer-motion reaches the product through one door (D34, D39).
 *
 * The eslint guard refuses the `motion` import file by file; this proves the
 * shape around it: exactly one `LazyMotion`, with `domAnimation` rather than
 * `domMax` and fetched in its own chunk, in strict mode so a stray
 * `motion.div` throws in development, and mounted once in the root layout so every `m` component has its features.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
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

describe("the framer-motion door", () => {
  const provider = readFileSync(join(__dirname, "MotionProvider.tsx"), "utf8");

  it("loads domAnimation, never domMax, after first paint, in strict mode", () => {
    const features = readFileSync(join(__dirname, "motion-features.ts"), "utf8");
    expect(features).toMatch(/export default domAnimation;/);
    expect(features + provider).not.toMatch(/domMax/);
    expect(provider).toMatch(/import\("\.\/motion-features"\)/);
    expect(provider).toMatch(/<LazyMotion features=\{loadFeatures\} strict>/);
  });

  it("is the only file that mounts LazyMotion", () => {
    const mounting = sources(SRC).filter((file) => /<LazyMotion\b/.test(readFileSync(file, "utf8")));
    expect(mounting.map((file) => file.slice(SRC.length + 1))).toEqual(["components/app/MotionProvider.tsx"]);
  });

  it("is mounted once, in the root layout", () => {
    const layout = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");
    expect(layout.match(/<MotionProvider>/g)).toHaveLength(1);
  });

  it("is never bypassed with the full motion component", () => {
    const offenders = sources(SRC).filter((file) =>
      /import\s*\{[^}]*\bmotion\b[^}]*\}\s*from\s*["']framer-motion["']/.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
