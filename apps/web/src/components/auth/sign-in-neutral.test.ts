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

describe("the E2E audit's auth findings (29 September 2026)", () => {
  it("L-3: sign-in asks for 'Your password'; the length rule stays on sign-up", async () => {
    const { getDictionary } = await import("@vallo/i18n");
    const t = getDictionary("en");
    expect(t.auth.signInPasswordPlaceholder).toBe("Your password");
    expect(t.auth.passwordPlaceholder).toBe("At least 8 characters");
    const form = src("components/auth/EmailAuthForm.tsx");
    /* The sign-in field is the one with current-password; the new-password
       field on step one of sign-up keeps the rule. */
    expect(form).toMatch(/placeholder=\{t\.auth\.signInPasswordPlaceholder\}\s*autoComplete="current-password"/);
    expect(form).toMatch(/placeholder=\{t\.auth\.passwordPlaceholder\}/);
  });

  it("L-5: the tour opened from the sign-up form says Back to sign up, not Skip", async () => {
    const { isSignUpForm } = await import("@/components/app/welcome/first-run-seen");
    expect(isSignUpForm("/sign-up/email")).toBe(true);
    expect(isSignUpForm("/sign-up/email?next=%2Fsearch")).toBe(true);
    expect(isSignUpForm("/sign-up")).toBe(false);
    expect(isSignUpForm("/sign-up/emailx")).toBe(false);
    expect(isSignUpForm(null)).toBe(false);
    const { getDictionary } = await import("@vallo/i18n");
    expect(getDictionary("en").welcomeCards.backToSignUp).toBe("Back to sign up");
    expect(src("app/welcome/page.tsx")).toContain("fromSignUpForm={tour && isSignUpForm(plan.next)}");
    expect(src("components/app/welcome/FirstRun.tsx")).toContain(
      "{backToForm ? t.welcomeCards.backToSignUp : t.welcomeCards.skip}",
    );
    /* The form's link still opens the tour with the form as `next`. */
    expect(src("components/auth/EmailAuthForm.tsx")).toContain(
      'href={`/welcome?tour=1&next=${encodeURIComponent(withNext("/sign-up/email", next))}`}',
    );
  });

  it("L-7: the verify screen submits with the same navy pill as every other auth screen", () => {
    const verify = src("components/auth/VerifyCodeForm.tsx");
    expect(verify).toContain('import { AuthPillButton } from "./slate";');
    expect(verify).toMatch(/<AuthPillButton type="submit" loading=\{verifying\}/);
    expect(verify).not.toMatch(/<Button type="submit" variant="primary"/);
  });
});
