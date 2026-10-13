import { describe, expect, it } from "vitest";
import { doorFirstRunRedirect, hasSessionCookie, signInFirstRunRedirect } from "./first-run-gate";
import { firstRunNext } from "@/components/app/welcome/first-run-seen";

describe("sign-in meets first run once (request W2)", () => {
  it("sends a device that has never seen first run to /welcome, carrying the sign-in address", () => {
    expect(signInFirstRunRedirect({ cookie: undefined, params: { next: "/search" } })).toBe(
      "/welcome?next=%2Fsign-in%3Fnext%3D%252Fsearch",
    );
  });

  it("shows it before the first Sign in tapped anywhere, even with no destination (the founder, 7 October)", () => {
    expect(signInFirstRunRedirect({ cookie: undefined, params: {} })).toBe("/welcome?next=%2Fsign-in");
  });

  it("shows it before the first Sign up too, carrying the sign-up address", () => {
    expect(doorFirstRunRedirect({ door: "/sign-up", cookie: undefined, params: {} })).toBe("/welcome?next=%2Fsign-up");
    expect(doorFirstRunRedirect({ door: "/sign-up", cookie: undefined, params: { next: "/u/ada?do=follow" } })).toBe(
      "/welcome?next=%2Fsign-up%3Fnext%3D%252Fu%252Fada%253Fdo%253Dfollow",
    );
    expect(doorFirstRunRedirect({ door: "/sign-up", cookie: "seen", params: {} })).toBeNull();
  });

  it("a leftover session cookie does not skip it (the founder, 8 October: an expired one sent him straight past)", () => {
    expect(signInFirstRunRedirect({ cookie: undefined, signedIn: true, params: {} })).toBe("/welcome?next=%2Fsign-in");
    expect(doorFirstRunRedirect({ door: "/sign-up", cookie: undefined, signedIn: true, params: {} })).toBe("/welcome?next=%2Fsign-up");
    expect(hasSessionCookie(["vallo_first_run", "sb-abc-auth-token.0"])).toBe(true);
    expect(hasSessionCookie(["vallo_first_run", "nf_theme"])).toBe(false);
  });

  it("keeps next and the notice, so the person lands back where they were going", () => {
    const href = signInFirstRunRedirect({
      cookie: null,
      params: { next: "/listing/abc?do=save", notice: "sign-in-required" },
    });
    expect(href).not.toBeNull();
    const inner = new URL(href!, "https://vallo.test").searchParams.get("next");
    expect(inner).toBe("/sign-in?next=%2Flisting%2Fabc%3Fdo%3Dsave&notice=sign-in-required");
    /* and first run itself accepts that as a safe place to hand on to */
    expect(firstRunNext(inner)).toBe(inner);
  });

  it("goes straight through once the device has seen it", () => {
    expect(signInFirstRunRedirect({ cookie: "seen", params: { next: "/home" } })).toBeNull();
  });

  it("goes straight through on welcomed=1, so a cookie-refusing browser cannot loop", () => {
    expect(signInFirstRunRedirect({ cookie: undefined, params: { welcomed: "1" } })).toBeNull();
  });

  it("does not explain Vallo to somebody who already has an account", () => {
    for (const notice of ["link-expired", "link-invalid", "signed-out", "passcode-locked", "unconfigured"]) {
      expect(signInFirstRunRedirect({ cookie: undefined, params: { notice } })).toBeNull();
    }
  });

  it("treats any other cookie value as not seen", () => {
    expect(signInFirstRunRedirect({ cookie: "yes", params: { next: "/home" } })).toBe(
      "/welcome?next=%2Fsign-in%3Fnext%3D%252Fhome",
    );
  });
});
