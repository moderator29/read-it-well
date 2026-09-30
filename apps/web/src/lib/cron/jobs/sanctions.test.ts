import { describe, expect, it } from "vitest";
import { listsVerdict, screenVerdict } from "./sanctions";

const zero = { screened: 0, clear: 0, exact: 0, fuzzy: 0, noList: 0, hits: 0, failed: 0, renewed: 0, listsUnreadable: false };

describe("the sanctions jobs' verdicts (SCUML items 8 and 9)", () => {
  it("is a clean run with no URL configured, and asks for attention when a refresh fails", () => {
    expect(listsVerdict([]).outcome).toBe("ok");
    const v = listsVerdict([{ source: "un", result: { state: "refused", reason: "no_entries" } }]);
    expect(v.alert?.kind).toBe("sanctions.list_refresh_failed");
    expect(listsVerdict([], 1).alert).toMatchObject({ kind: "sanctions.list_waiting", detail: { waiting: 1 } });
    expect(listsVerdict([], null)).toMatchObject({ outcome: "attention", alert: { kind: "sanctions.list_waiting_unreadable" } });
    expect(listsVerdict([{ source: "ng", result: { state: "waiting", versionId: "v", entries: 2, why: "unverified" } }], 0).alert?.kind).toBe("sanctions.list_incomplete");
  });

  it("raises matches as counts only, and an unreadable list as critical", () => {
    const hit = screenVerdict({ ...zero, screened: 5, exact: 1, hits: 1 });
    expect(hit.alert).toMatchObject({ kind: "sanctions.hits_raised", detail: { hits: 1, exact: 1 } });
    expect(JSON.stringify(hit)).not.toMatch(/name/i);
    expect(screenVerdict({ ...zero, listsUnreadable: true }).alert?.severity).toBe("critical");
    expect(screenVerdict({ ...zero, screened: 3, clear: 3 }).outcome).toBe("ok");
  });

  it("keeps a failed hold renewal apart from a failed screening, at info (C13)", () => {
    const v = screenVerdict({ ...zero, renewFailed: 1 });
    expect(v.alert).toMatchObject({ kind: "sanctions.hold_renew_failed", severity: "info" });
    expect(screenVerdict({ ...zero, failed: 2, renewFailed: 1 }).alert?.kind).toBe("sanctions.screen_failed");
  });
});
