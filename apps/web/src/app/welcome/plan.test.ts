import { describe, expect, it } from "vitest";
import type { InterestsState } from "@/lib/interests/queries";
import { arrivalOf, planFirstRun } from "./plan";
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
  it("is shown first run from the first slide, keeping where they were going", () => {
    expect(planFirstRun({ session: signedOut, next: "/sign-up" })).toEqual({ kind: "guest", next: "/sign-up", arrival: null });
  });

  it("is shown it again every time it is asked for: nothing redirects", () => {
    /* The founder's rule of 23 September. The device cookie is still written
       for the sign up and sign in detour, but it no longer enters this plan. */
    expect(planFirstRun({ session: signedOut, next: null })).toEqual({ kind: "guest", next: null, arrival: null });
  });

  it("is treated the same on a platform with no keys", () => {
    expect(planFirstRun({ session: { state: "unconfigured" }, next: null }).kind).toBe("guest");
  });
});

describe("somebody signed in", () => {
  it("is shown first run too, ending on the interests question while it is unanswered", () => {
    expect(planFirstRun({ session: member(), next: null })).toMatchObject({
      kind: "member",
      intent: { asked: false },
    });
  });

  it("is shown it even when everything is done, ending on one Continue into the app", () => {
    expect(planFirstRun({ session: member({ asked: true, welcomeSeen: true }), next: null })).toMatchObject({
      kind: "member",
      next: null,
      intent: { asked: true },
    });
  });

  it("carries on to a real destination, never to a sign-in door", () => {
    const done = member({ asked: true, welcomeSeen: true });
    expect(planFirstRun({ session: done, next: "/saved" })).toMatchObject({ next: "/saved" });
    expect(planFirstRun({ session: done, next: "/sign-up" })).toMatchObject({ next: null });
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

describe("arrivals with a destination skip the slides (V-18)", () => {
  it("reads the destination under the wall's sign-in door", () => {
    const next = "/sign-in?next=%2Fsearch%3Fq%3DLagos&notice=sign-in-required";
    const plan = planFirstRun({ session: signedOut, next });
    expect(plan.kind).toBe("guest");
    if (plan.kind !== "guest") return;
    expect(plan.arrival).toEqual({
      destination: "/search?q=Lagos",
      reason: { kind: "search", place: "Lagos" },
      interest: null,
    });
  });

  it("names a shared listing, a stay and anything else", () => {
    expect(arrivalOf("/sign-in?next=%2Flisting%2Fabc")?.reason).toEqual({ kind: "listing" });
    expect(arrivalOf("/stay/abc")?.reason).toEqual({ kind: "stay" });
    expect(arrivalOf("/stays/search?type=hotel")?.reason).toEqual({ kind: "stay" });
    expect(arrivalOf("/wallet")?.reason).toEqual({ kind: "other" });
  });

  it("carries the market a landing tile named, and only a real one", () => {
    expect(arrivalOf("/sign-in?next=%2Fsearch%3Ftype%3Dapartment")?.interest).toBe("apartment");
    expect(arrivalOf("/search?type=castle")?.interest).toBeNull();
    expect(arrivalOf("/search?q=Lagos")?.interest).toBeNull();
  });

  it("is a cold start for no next, a bare door, and a door inside a door", () => {
    expect(arrivalOf(null)).toBeNull();
    expect(arrivalOf("/sign-in")).toBeNull();
    expect(arrivalOf("/sign-up?next=%2Fsign-in")).toBeNull();
    expect(arrivalOf("/sign-in?notice=sign-in-required")).toBeNull();
    const plan = planFirstRun({ session: signedOut, next: "/sign-in" });
    expect(plan.kind === "guest" && plan.arrival).toBeNull();
  });

  it("refuses a destination that leaves the origin", () => {
    expect(arrivalOf("/sign-in?next=%2F%2Fevil.example")).toBeNull();
    expect(arrivalOf("/sign-in?next=https%3A%2F%2Fevil.example")).toBeNull();
  });

  it("caps a search term, since it is printed in a heading", () => {
    const long = "a".repeat(200);
    const reason = arrivalOf(`/search?q=${long}`)?.reason;
    expect(reason?.kind === "search" && reason.place?.length).toBe(40);
    expect(arrivalOf("/search?q=%20%20")?.reason).toEqual({ kind: "search", place: null });
  });

  it("pre-ticks a carried market for a member who has not answered, and only then", () => {
    const fresh = planFirstRun({ session: member(), next: null, carried: "rental" });
    expect(fresh.kind === "member" && fresh.intent.interests).toEqual(["rental"]);
    const answered = planFirstRun({ session: member({ asked: true }), next: null, carried: "rental" });
    expect(answered.kind === "member" && answered.intent.interests).toEqual([]);
  });
});
