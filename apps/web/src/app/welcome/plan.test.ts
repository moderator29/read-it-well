import { describe, expect, it } from "vitest";
import type { InterestsState } from "@/lib/interests/queries";
import { planFirstRun } from "./plan";
import {
  FIRST_RUN_COOKIE,
  firstRunCookieString,
  firstRunHref,
  firstRunNext,
  isFirstRunSeen,
  withPassedFlag,
} from "@/components/app/welcome/first-run-seen";

/*
 * "Seen once", end to end in the one place it can be tested without a
 * browser: the cookie the client writes, the value the server reads back, and
 * the decision `/welcome` takes from it. The browser half (the click writes
 * the cookie, the next request carries it) is proved by
 * `tests/session-b-welcome.spec.mjs` against a running server.
 */

/* What the server would read back from the exact string the client writes. */
function readBack(cookieString: string): string | undefined {
  const [pair] = cookieString.split(";");
  const [name, value] = (pair ?? "").split("=");
  return name === FIRST_RUN_COOKIE ? value : undefined;
}

const signedOut: InterestsState = { state: "signed-out" };
const member = (over: { asked?: boolean; welcomeSeen?: boolean } = {}): InterestsState => ({
  state: "signed-in",
  interests: [],
  asked: false,
  welcomeSeen: false,
  ...over,
});

describe("the device memory", () => {
  it("round trips: what the client writes, the server reads as seen", () => {
    expect(isFirstRunSeen(readBack(firstRunCookieString(true)))).toBe(true);
    expect(isFirstRunSeen(readBack(firstRunCookieString(false)))).toBe(true);
  });

  it("lasts, is first party and is sent on a normal navigation", () => {
    const c = firstRunCookieString(true);
    expect(c).toMatch(/Path=\//);
    expect(c).toMatch(/Max-Age=34560000/);
    expect(c).toMatch(/SameSite=Lax/);
    expect(c).toMatch(/Secure/);
    expect(firstRunCookieString(false)).not.toMatch(/Secure/);
  });

  it("treats anything else as not seen", () => {
    expect(isFirstRunSeen(undefined)).toBe(false);
    expect(isFirstRunSeen("")).toBe(false);
    expect(isFirstRunSeen("1")).toBe(false);
  });
});

describe("a stranger", () => {
  it("sees the slides from the first one the first time", () => {
    expect(planFirstRun({ session: signedOut, deviceSeen: false, next: "/sign-up" })).toEqual({
      kind: "guest",
      startAt: "first",
      next: "/sign-up",
    });
  });

  it("is never shown them twice: with somewhere to go, they go there", () => {
    const seen = isFirstRunSeen(readBack(firstRunCookieString(true)));
    expect(planFirstRun({ session: signedOut, deviceSeen: seen, next: "/sign-in" })).toEqual({
      kind: "redirect",
      to: "/sign-in",
    });
  });

  it("and with nowhere to go, they land on the choice", () => {
    expect(planFirstRun({ session: signedOut, deviceSeen: true, next: null })).toEqual({
      kind: "guest",
      startAt: "choice",
      next: null,
    });
  });

  it("is treated the same on a platform with no keys", () => {
    expect(planFirstRun({ session: { state: "unconfigured" }, deviceSeen: false, next: null }).kind).toBe(
      "guest",
    );
  });
});

describe("somebody signed in", () => {
  it("sees the slides when neither profile nor device has", () => {
    const plan = planFirstRun({ session: member(), deviceSeen: false, next: null });
    expect(plan).toMatchObject({ kind: "member", intent: { welcomeSeen: false, asked: false } });
  });

  it("is not shown them again after reading them before signing up", () => {
    const plan = planFirstRun({ session: member(), deviceSeen: true, next: null });
    expect(plan).toMatchObject({ kind: "member", intent: { welcomeSeen: true, asked: false } });
  });

  it("goes home once both halves are done", () => {
    expect(
      planFirstRun({ session: member({ asked: true, welcomeSeen: true }), deviceSeen: false, next: null }),
    ).toEqual({ kind: "redirect", to: "/home" });
  });

  it("goes on to a real destination, but never back to a sign-in door", () => {
    const done = member({ asked: true, welcomeSeen: true });
    expect(planFirstRun({ session: done, deviceSeen: false, next: "/saved" })).toEqual({
      kind: "redirect",
      to: "/saved",
    });
    expect(planFirstRun({ session: done, deviceSeen: false, next: "/sign-up" })).toEqual({
      kind: "redirect",
      to: "/home",
    });
  });
});

describe("the destination", () => {
  it("keeps same-origin paths and their query", () => {
    expect(firstRunNext("/sign-in?next=%2Fwallet")).toBe("/sign-in?next=%2Fwallet");
  });

  it("refuses other origins, loops and junk", () => {
    expect(firstRunNext("//evil.example")).toBeNull();
    expect(firstRunNext("https://evil.example")).toBeNull();
    expect(firstRunNext("/welcome")).toBeNull();
    expect(firstRunNext("/start")).toBeNull();
    expect(firstRunNext("/%0aboom")).toBeNull();
    expect(firstRunNext(undefined)).toBeNull();
  });

  it("builds the address that meets first run, and the storage-blocked escape", () => {
    expect(firstRunHref("/sign-up")).toBe("/welcome?next=%2Fsign-up");
    expect(withPassedFlag("/sign-up")).toBe("/sign-up?welcomed=1");
    expect(withPassedFlag("/sign-in?next=%2Fwallet")).toBe("/sign-in?next=%2Fwallet&welcomed=1");
  });
});
