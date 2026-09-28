import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * F-08: the password step says one neutral thing, and never whether an
 * account uses the address. Also: the chooser no longer puts the address in
 * the URL. Source-level pins, because the pieces are a "use server" module and
 * server components that this suite cannot render.
 */
const src = (path: string) => readFileSync(join(__dirname, "../..", path), "utf8");

describe("the sign-in password step", () => {
  it("answers a wrong password with one neutral sentence that offers the reset", () => {
    expect(src("lib/auth/actions.ts")).toContain(
      '"That email and password do not match. Check both, or reset your password."',
    );
  });

  it("does not draw the no-account notice", () => {
    const form = src("components/auth/EmailAuthForm.tsx");
    expect(form).not.toContain("t.auth.accountNotFound");
    expect(form).not.toMatch(/accountMethod === "none"/);
  });

  it("treats an address with no account as the ordinary password step", () => {
    expect(src("app/(auth)/sign-in/email/page.tsx")).toMatch(
      /accountMethod = method === "none" \? "unknown" : method;/,
    );
  });
});

describe("the chooser's address", () => {
  it("is posted to an action that keeps it in a cookie, not sent as a GET", () => {
    const choices = src("components/auth/AuthChoices.tsx");
    expect(choices).toContain("<form action={continueWithEmail}");
    expect(choices).not.toMatch(/method="get"/);
    const actions = src("lib/auth/actions.ts");
    expect(actions).toMatch(/export async function continueWithEmail\(/);
    expect(actions).toMatch(/httpOnly: true,[\s\S]{0,120}maxAge: CHOOSER_EMAIL_MAX_AGE/);
  });

  it("is read back by both email steps", () => {
    for (const page of ["app/(auth)/sign-in/email/page.tsx", "app/(auth)/sign-up/email/page.tsx"]) {
      expect(src(page), page).toContain("await chooserEmail()");
    }
  });
});
