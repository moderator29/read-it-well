import { describe, expect, it } from "vitest";
import { BIO_ENROL_HREF, shouldOfferBiometric } from "./biometric-offer";

describe("shouldOfferBiometric", () => {
  it("offers once to a member with no key on a device that can ask its own lock", () => {
    expect(shouldOfferBiometric({ enrolled: false, supported: true, seen: false })).toBe(true);
  });
  it("never offers to a member who is already enrolled", () => {
    expect(shouldOfferBiometric({ enrolled: true, supported: true, seen: false })).toBe(false);
  });
  it("never offers where the device cannot do it", () => {
    expect(shouldOfferBiometric({ enrolled: false, supported: false, seen: false })).toBe(false);
  });
  it("never offers twice on one device", () => {
    expect(shouldOfferBiometric({ enrolled: false, supported: true, seen: true })).toBe(false);
  });
  it("links to the enrolment that asks for the password, not to anything that unlocks", () => {
    expect(BIO_ENROL_HREF).toBe("/settings/privacy/money-lock");
  });
});
