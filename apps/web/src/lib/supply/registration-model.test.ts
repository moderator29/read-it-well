import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIELD_STEP, earliestStep } from "./registration-model";

describe("the register forms' client-safe model", () => {
  it("imports no zod, so the three forms keep zod's classic API out of the browser", () => {
    const source = readFileSync(join(__dirname, "registration-model.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["']zod/);
  });

  it("walks back to the earliest screen a refusal names, and to none when it names none", () => {
    expect(earliestStep(undefined)).toBeNull();
    expect(earliestStep({})).toBeNull();
    expect(earliestStep({ somethingElse: "x" })).toBeNull();
    expect(earliestStep({ team: "x", nin: "y" })).toBe(FIELD_STEP.nin);
    expect(earliestStep({ "team.0": "x", fullName: "y" })).toBe(0);
    expect(earliestStep({ agencyFeeBps: "x" })).toBe(2);
  });
});
