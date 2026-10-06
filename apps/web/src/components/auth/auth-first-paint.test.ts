import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THE FIRST 400MS (U1, 6 October). Measured in a production build before
 * this change: every auth URL first painted the GROUP's slab skeleton
 * (`(auth)/loading.tsx`), then on /sign-in, /sign-up/* and /forgot-password/*
 * the parent segment's skeleton, then the screen, each a different height,
 * so the island grew and the small print under it moved (layout shift up to
 * 0.018). A segment's `loading.tsx` wraps every route BELOW it, so a parent
 * with a loading file paints its own shape on its children first.
 *
 * Held here: no loading file at the group or at a segment with children;
 * those pages wait inside their own Suspense, and every wait draws the
 * screen itself, inert (`AuthWait`), not slabs of another shape.
 */
const app = (path: string) => join(__dirname, "../../app/(auth)", path);
const read = (path: string) => readFileSync(app(path), "utf8");

describe("the first paint of an auth screen is that screen", () => {
  it("has no loading file wrapping more than its own page", () => {
    for (const parent of ["loading.tsx", "sign-in/loading.tsx", "sign-up/loading.tsx", "forgot-password/loading.tsx"]) {
      expect(existsSync(app(parent)), parent).toBe(false);
    }
  });

  it("waits on sign in and the sign-up options inside the page, drawing the same screen", () => {
    for (const page of ["sign-in/page.tsx", "sign-up/page.tsx"]) {
      const src = read(page);
      expect(src, page).toMatch(/<Suspense fallback=\{<\w+Wait /);
      expect(src, page).toContain("<AuthWait>");
    }
  });

  it("draws each leaf wait as its own screen, inert, through the loading kit", () => {
    const leaves: Record<string, RegExp> = {
      "sign-in/code/loading.tsx": /<CodeSignInForm mode="email"/,
      "sign-in/phone/loading.tsx": /<CodeSignInForm mode="phone"/,
      "sign-up/email/loading.tsx": /<EmailAuthForm\s+mode="sign-up"/,
      "sign-up/verify/loading.tsx": /<VerifyCodeForm/,
      "forgot-password/code/loading.tsx": /<ResetCodeForm/,
    };
    for (const [file, screen] of Object.entries(leaves)) {
      const src = read(file);
      expect(src, file).toContain("<AuthWait>");
      expect(src, file).toMatch(screen);
    }
    const wait = readFileSync(join(__dirname, "AuthWait.tsx"), "utf8");
    expect(wait).toMatch(/<LoadingShell label=\{label\}/);
    expect(wait).toMatch(/<div inert>/);
  });

  it("lands a screen over a painted wait at once instead of replaying its entrance", () => {
    const css = readFileSync(join(__dirname, "../../app/css/auth.css"), "utf8");
    expect(css).toMatch(/@property --nf-auth-waited/);
    expect(css).toMatch(/\.nf-auth__island:has\(\.nf-auth__wait\) \{\s*--nf-auth-waited: 1;/);
    expect(css).toMatch(/animation: nf-auth-piece-in calc\(var\(--nf-duration-slow\) \* \(1 - var\(--nf-auth-waited, 0\)\)\)/);
  });
});
