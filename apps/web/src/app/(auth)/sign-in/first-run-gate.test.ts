import { describe, expect, it } from "vitest";
import { signInFirstRunRedirect } from "./first-run-gate";
import { firstRunNext } from "@/components/app/welcome/first-run-seen";

describe("sign-in meets first run once (request W2)", () => {
  it("sends a device that has never seen first run to /welcome, carrying the sign-in address", () => {
    expect(signInFirstRunRedirect({ cookie: undefined, params: { next: "/search" } })).toBe(
      "/welcome?next=%2Fsign-in%3Fnext%3D%252Fsearch",
    );
  });

  it("never shows the carousel to a Sign in tapped on purpose (V-18)", () => {
    expect(signInFirstRunRedirect({ cookie: undefined, params: {} })).toBeNull();
    expect(signInFirstRunRedirect({ cookie: undefined, params: { next: "" } })).toBeNull();
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
    for (const notice of ["link-expired", "link-invalid", "signed-out"]) {
      expect(signInFirstRunRedirect({ cookie: undefined, params: { notice } })).toBeNull();
    }
  });

  it("treats any other cookie value as not seen", () => {
    expect(signInFirstRunRedirect({ cookie: "yes", params: { next: "/home" } })).toBe(
      "/welcome?next=%2Fsign-in%3Fnext%3D%252Fhome",
    );
  });
});
