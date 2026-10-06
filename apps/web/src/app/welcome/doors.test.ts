import { describe, expect, it } from "vitest";
import { introDoors } from "./doors";

describe("Get Started's doors", () => {
  it("a cold start's Get started carries the flow on to the onboarding questions", () => {
    expect(introDoors(null).signUp).toBe("/sign-up?next=%2Fwelcome");
    expect(introDoors(null).signIn).toBe("/sign-in");
  });

  it("the old /start hand-over (a bare sign-up door) gains the same destination", () => {
    expect(introDoors("/sign-up").signUp).toBe("/sign-up?next=%2Fwelcome");
    expect(introDoors("/sign-up/email").signUp).toBe("/sign-up/email?next=%2Fwelcome");
  });

  it("a door that already carries a destination keeps it, untouched", () => {
    expect(introDoors("/sign-up?next=%2Flisting%2Fabc").signUp).toBe("/sign-up?next=%2Flisting%2Fabc");
    expect(introDoors("/sign-in?next=%2Fsearch").signIn).toBe("/sign-in?next=%2Fsearch");
  });

  it("a destination that is not a door does not become one", () => {
    expect(introDoors("/search?q=lekki")).toEqual({ signUp: "/sign-up?next=%2Fwelcome", signIn: "/sign-in" });
  });
});
