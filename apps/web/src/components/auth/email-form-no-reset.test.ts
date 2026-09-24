import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UX-14: React resets a form after a `<form action>` submission completes,
 * refusal included, which unticked the terms box and cleared the "where did
 * you hear" select on every refused sign-up. The form dispatches its action
 * from onSubmit instead (no reset follows a manual dispatch). This pins the
 * shape of that submit handler; it does not drive a browser.
 */
const SOURCE = readFileSync(join(__dirname, "EmailAuthForm.tsx"), "utf8");
const FORM = SOURCE.slice(SOURCE.indexOf("<form\n        action={formAction}"));
const ON_SUBMIT = FORM.slice(FORM.indexOf("onSubmit="), FORM.indexOf("className=", FORM.indexOf("onSubmit=")));

describe("the email auth form keeps its answers after a refusal", () => {
  it("always takes over the submit and dispatches the action itself", () => {
    expect(ON_SUBMIT).toMatch(/^onSubmit=\{\(e\) => \{[\s\S]*?\n\s*e\.preventDefault\(\);/);
    expect(ON_SUBMIT).toContain("startTransition(() => formAction(data))");
    expect(ON_SUBMIT).toContain("new FormData(e.currentTarget)");
  });

  it("still refuses an unticked sign-up before sending anything", () => {
    const refuse = ON_SUBMIT.indexOf("if (isSignUp && !accepted)");
    expect(refuse).toBeGreaterThan(-1);
    expect(refuse).toBeLessThan(ON_SUBMIT.indexOf("formAction(data)"));
    expect(ON_SUBMIT.slice(refuse, ON_SUBMIT.indexOf("formAction(data)"))).toContain("return;");
  });
});
