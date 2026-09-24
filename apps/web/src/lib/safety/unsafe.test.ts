import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { RESPONSE_COMMITMENTS, responseTimeFor } from "../trust/standards";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("the report clock a reporter reads (V-63)", () => {
  it("is the category's own promise, from the one table", () => {
    expect(responseTimeFor("unsafe")).toEqual({ grade: "urgent", hours: 4, phrase: "within 4 hours" });
    expect(responseTimeFor("off_platform_payment").phrase).toBe("within 4 hours");
    expect(responseTimeFor("not_as_described").phrase).toBe("within 1 day");
    expect(responseTimeFor("duplicate").phrase).toBe("within 3 days");
    expect(responseTimeFor(null).hours).toBe(RESPONSE_COMMITMENTS.standard.hours);
  });

  it("is what the report sheet prints, with 112 as a number to tap and no blanket twenty four hours", () => {
    const sheet = read("components/app/ReportSheet.tsx");
    expect(sheet).toContain('responseTimeFor(category).phrase');
    expect(sheet).toContain('href="tel:112"');
    expect(sheet).not.toMatch(/twenty\s+four\s+hours/);
    expect(getDictionary("en").trustVisible.report.filed).toContain("{clock}");
  });
});

describe("I feel unsafe (V-63)", () => {
  it("is in every thread's options and on every open inspection", () => {
    expect(read("app/(app)/messages/[id]/ThreadOptionsSheet.tsx")).toContain("<UnsafeSheet");
    expect(read("components/app/inspections/InspectionSheet.tsx")).toContain("<UnsafeSheet copy={unsafe} inspectionId={inspection.id}");
    expect(read("app/(app)/inspections/page.tsx")).toContain("unsafe={t.trustVisible.unsafe}");
  });

  it("offers 112 first, then leave and block, then tell Vallo, and never a row that does nothing", () => {
    const sheet = read("components/app/safety/UnsafeSheet.tsx");
    const call = sheet.indexOf('href="tel:112"');
    const leave = sheet.indexOf('data-testid="unsafe-leave"');
    const tell = sheet.indexOf('data-testid="unsafe-tell"');
    expect(call).toBeGreaterThan(0);
    expect(call).toBeLessThan(leave);
    expect(leave).toBeLessThan(tell);
    expect(sheet).not.toContain("unsafe-tell-someone");
  });

  it("is never slowed by a phone code, and the inspection action honours the hold", () => {
    const action = read("lib/safety/unsafe-actions.ts");
    expect(action).not.toContain("phoneGateFor");
    expect(action).toContain('rpc("feel_unsafe"');
    const inspections = read("lib/inspections/actions.ts");
    expect(inspections).toContain('rpc("safety_hold_open", { p_user: session.user.id })');
  });
});
