import { describe, expect, it } from "vitest";
import {
  accountProviders,
  FINISH_SETUP_PATH,
  finishSetupGateApplies,
  finishSetupHref,
  mayOweSetup,
  prefillName,
  SETUP_DONE_CLAIM,
  setupRecordComplete,
} from "./finish-setup";

/** B-2: the pure rule behind "Finish setting up". */
describe("which sessions may owe the step", () => {
  it("a Google-only or Apple-only account may", () => {
    expect(mayOweSetup({ app_metadata: { provider: "google", providers: ["google"] } })).toBe(true);
    expect(mayOweSetup({ app_metadata: { provider: "apple", providers: ["apple"] } })).toBe(true);
    expect(mayOweSetup({ app_metadata: { provider: "google" } })).toBe(true);
  });

  it("an account with an email identity passed the sign-up form, so never", () => {
    expect(mayOweSetup({ app_metadata: { provider: "email", providers: ["email"] } })).toBe(false);
    expect(mayOweSetup({ app_metadata: { provider: "google", providers: ["google", "email"] } })).toBe(false);
  });

  it("the done flag ends it without a read", () => {
    expect(mayOweSetup({ app_metadata: { providers: ["google"], [SETUP_DONE_CLAIM]: true } })).toBe(false);
    /* Only a real true: a string cannot pass for it. */
    expect(mayOweSetup({ app_metadata: { providers: ["google"], [SETUP_DONE_CLAIM]: "true" } })).toBe(true);
  });

  it("a token that names no provider is never held", () => {
    expect(mayOweSetup(null)).toBe(false);
    expect(mayOweSetup({})).toBe(false);
    expect(mayOweSetup({ app_metadata: {} })).toBe(false);
    expect(accountProviders({ app_metadata: { providers: [1, "", "google"] } })).toEqual(["google"]);
  });
});

describe("when the record is complete", () => {
  it("needs both the terms and the age statement", () => {
    expect(setupRecordComplete([{ document: "terms" }, { document: "age_18_or_over" }])).toBe(true);
    expect(setupRecordComplete([{ document: "terms" }, { document: "privacy" }])).toBe(false);
    expect(setupRecordComplete([{ document: "age_18_or_over" }])).toBe(false);
    expect(setupRecordComplete([])).toBe(false);
    expect(setupRecordComplete(null)).toBe(false);
  });
});

describe("which requests the gate may hold", () => {
  const holds = (path: string, extra: Partial<Parameters<typeof finishSetupGateApplies>[0]> = {}) =>
    finishSetupGateApplies({ path, method: "GET", isPublic: false, isServerAction: false, ...extra });

  it("holds app pages", () => {
    for (const path of ["/home", "/search", "/profile", "/admin", "/agent/dashboard", "/home/"]) {
      expect(holds(path), path).toBe(true);
    }
  });

  it("never holds the step, the legal pages, sign-out, the API or a public address", () => {
    expect(holds(FINISH_SETUP_PATH)).toBe(false);
    expect(holds("/legal/terms")).toBe(false);
    expect(holds("/legal/privacy")).toBe(false);
    expect(holds("/legal")).toBe(false);
    expect(holds("/sign-out")).toBe(false);
    expect(holds("/api/push/register")).toBe(false);
    expect(holds("/terms", { isPublic: true })).toBe(false);
  });

  it("never holds a server action (signing out) or a write", () => {
    expect(holds("/settings", { method: "POST", isServerAction: true })).toBe(false);
    expect(holds("/settings", { method: "POST" })).toBe(false);
    expect(holds("/home", { method: "HEAD" })).toBe(true);
  });
});

describe("the step's address", () => {
  it("carries next and never points at itself", () => {
    expect(finishSetupHref("/listing/abc?x=1")).toBe(`${FINISH_SETUP_PATH}?next=%2Flisting%2Fabc%3Fx%3D1`);
    expect(finishSetupHref(null)).toBe(FINISH_SETUP_PATH);
    expect(finishSetupHref(FINISH_SETUP_PATH)).toBe(FINISH_SETUP_PATH);
    expect(finishSetupHref(`${FINISH_SETUP_PATH}?next=%2Fhome`)).toBe(FINISH_SETUP_PATH);
  });
});

describe("the name from the provider", () => {
  it("prefers the profile row, then Google's parts, then a full name split", () => {
    expect(prefillName({ profile: { first_name: "Ada", surname: "Obi" } })).toEqual({ firstName: "Ada", surname: "Obi" });
    expect(prefillName({ profile: null, metadata: { given_name: "Ada", family_name: "Obi" } })).toEqual({
      firstName: "Ada",
      surname: "Obi",
    });
    expect(prefillName({ metadata: { full_name: "Ada Chioma Obi" } })).toEqual({ firstName: "Ada Chioma", surname: "Obi" });
    expect(prefillName({ metadata: { name: "Ada" } })).toEqual({ firstName: "Ada", surname: "" });
    expect(prefillName({})).toEqual({ firstName: "", surname: "" });
  });
});
