import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isInPageStep } from "@/lib/nav/in-page-step";
import {
  asksForStepTwo,
  hrefForStep,
  isStepTwoEntry,
  stepAfterTraversal,
  stepTwoState,
} from "./signup-step-history";

const at = (pathname: string, search = "", hash = "") => ({ pathname, search, hash });

describe("sign up's step two as a history entry", () => {
  it("adds ?step=2 for step two and removes it for step one, keeping the rest", () => {
    expect(hrefForStep(at("/sign-up/email"), 2)).toBe("/sign-up/email?step=2");
    expect(hrefForStep(at("/sign-up/email", "?next=%2Fsearch"), 2)).toBe(
      "/sign-up/email?next=%2Fsearch&step=2",
    );
    expect(hrefForStep(at("/sign-up/email", "?next=%2Fsearch&step=2", "#f"), 1)).toBe(
      "/sign-up/email?next=%2Fsearch#f",
    );
    expect(hrefForStep(at("/sign-up/email", "?step=2"), 1)).toBe("/sign-up/email");
  });

  it("stamps the step-two entry so Android's back treats it as a step", () => {
    const state = stepTwoState();
    expect(isStepTwoEntry(state)).toBe(true);
    expect(isInPageStep(state)).toBe(true);
    /* Next.js merges its own keys into the state; the stamp survives them. */
    expect(isStepTwoEntry({ ...state, __NA: true })).toBe(true);
    expect(isStepTwoEntry(null)).toBe(false);
    expect(isStepTwoEntry({ __NA: true })).toBe(false);
  });

  it("Back lands on step one; Forward lands on step two only with step one intact", () => {
    expect(stepAfterTraversal({ __NA: true }, true)).toBe(1);
    expect(stepAfterTraversal(stepTwoState(), true)).toBe(2);
    expect(stepAfterTraversal(stepTwoState(), false)).toBe(1);
  });

  it("a reload on ?step=2 is asked to fall back to step one", () => {
    expect(asksForStepTwo("?step=2")).toBe(true);
    expect(asksForStepTwo("?next=%2Fhome")).toBe(false);
    expect(asksForStepTwo("")).toBe(false);
  });

  it("is wired into the form: Next pushes, back and reload use the helpers", () => {
    const form = readFileSync(join(__dirname, "../../components/auth/EmailAuthForm.tsx"), "utf8");
    expect(form).toContain("window.history.pushState(stepTwoState()");
    expect(form).toContain('window.addEventListener("popstate"');
    expect(form).toContain("asksForStepTwo(window.location.search)");
  });
});
