import { describe, expect, it } from "vitest";
import { reviewIneligibility } from "./eligibility";

/**
 * NEW-A1-03: the rule reviews_insert_own applies, as the screens read it.
 * COMPLETED is the ordinary state of a stay that happened (the nightly job
 * moves a paid stay there the morning after check-out), so it is reviewable;
 * a tenancy is not a stay.
 */
const TODAY = "2026-09-24";
const at = (status: string, checkOut = "2026-09-20", isTenancy = false) =>
  reviewIneligibility({ status, checkOut, isTenancy }, TODAY);

describe("reviewIneligibility", () => {
  it("opens a COMPLETED stay and a CONFIRMED stay whose check-out has passed", () => {
    expect(at("COMPLETED")).toBeNull();
    expect(at("CONFIRMED")).toBeNull();
    expect(at("CONFIRMED", TODAY)).toBeNull();
  });

  it("waits for a stay that has not finished", () => {
    expect(at("CONFIRMED", "2026-09-25")).toBe("not-finished");
  });

  it("names every other state for what it is", () => {
    expect(at("PENDING")).toBe("unconfirmed");
    expect(at("CANCELLED")).toBe("cancelled");
    expect(at("NO_SHOW")).toBe("no-show");
  });

  it("never opens a tenancy, whatever its status", () => {
    expect(at("CONFIRMED", "2026-09-20", true)).toBe("tenancy");
    expect(at("COMPLETED", "2026-09-20", true)).toBe("tenancy");
  });
});
