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
    /* No read of one's own hold, and no sentence of its own: a held request
       reads as any listing not taking requests. */
    expect(inspections).not.toContain("safety_hold_open");
    expect(inspections).not.toContain("safety_hold");
  });
});

describe("the hold, after review (V-63)", () => {
  it("never lets a held person learn of the hold, and pauses only the person asking", () => {
    const sql = read("../../../supabase/migrations/20260924131400_v63_i_feel_unsafe.sql");
    expect(sql).not.toContain("create or replace function public.safety_hold_open");
    expect(sql).toContain("if private.has_open_safety_hold(new.requester_id, new.lister_id) then");
    expect(sql).toContain(`raise exception 'new row violates row-level security policy for table "inspection_requests"'`);
    expect(sql).not.toContain("hint = 'safety_hold'");
    expect(sql).toContain("escalated := report is not null and previous is distinct from 'unsafe';");
    expect(sql).not.toContain("h.held_id in (new.requester_id, new.lister_id)");
    expect(sql).toContain("expires_at  timestamptz not null default now() + interval '72 hours'");
    expect(sql).toContain("m.sender_id = me");
  });

  it("is listed on the moderation lane with Clear and Extend", () => {
    expect(read("app/admin/moderation/page.tsx")).toContain("<SafetyHolds rows={holds} />");
    const buttons = read("app/admin/moderation/SafetyHoldButtons.tsx");
    expect(buttons).toContain('act("clear")');
    expect(buttons).toContain('act("extend")');
  });

  it("tells the filer the truth about what the other person reads", () => {
    const copy = getDictionary("en").trustVisible.unsafe;
    expect(copy.openerHint).not.toMatch(/not told/);
    /* No promise of anonymity the product cannot keep. */
    expect(copy.heldNote).not.toMatch(/never who|not told|anonym/i);
    expect("held" in copy).toBe(false);
    const sheet = read("components/app/safety/UnsafeSheet.tsx");
    expect(sheet).toContain("result.data.held && filerIsLister ? `${said} ${copy.heldNote}` : said");
  });

  it("speaks of paused requests only to a lister", () => {
    const copy = getDictionary("en").trustVisible.unsafe;
    expect(copy.leaveHint).not.toMatch(/inspection/);
    expect(copy.tellHint).not.toMatch(/inspection/);
    expect(copy.pauseHint).toMatch(/inspection requests to you pause/);
    const sheet = read("components/app/safety/UnsafeSheet.tsx");
    expect(sheet).toContain("filerIsLister ? `${copy.leaveHint} ${copy.pauseHint}` : copy.leaveHint");
    expect(read("components/app/inspections/InspectionSheet.tsx")).toContain('filerIsLister={side === "lister"}');
    expect(read("app/(app)/messages/[id]/ThreadView.tsx")).toContain('unsafeAsLister={context?.kind === "listing" && role === "host"}');
  });
});
