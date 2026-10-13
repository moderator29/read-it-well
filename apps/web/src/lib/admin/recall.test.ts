import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { recallPreviewFrom, recallReason, recallSendFrom, reportRef, willTell } from "./recall";

const desk = getDictionary("en").trustVisible.desk;

describe("recalling a stop (V-60)", () => {
  it("reads the preview, with and without a recall already sent", () => {
    expect(recallPreviewFrom([{ audience: 14, category: null, sent_at: null, sent_to: null, sent_category: null, lifted: false }])).toEqual({
      audience: 14,
      lifted: false,
      category: null,
      report: null,
      sent: null,
    });
    const sent = recallPreviewFrom([
      { audience: 14, category: "scam", sent_at: "2026-10-04T09:00:00Z", sent_to: 14, sent_category: "scam", lifted: false },
    ]);
    expect(sent?.sent).toEqual({ at: "2026-10-04T09:00:00Z", to: 14, category: "scam" });
    expect(sent?.category).toBe("scam");
    expect(
      recallPreviewFrom([{ audience: 2, category: "scam", report_id: "r1", report_resolved_at: "2026-10-01T09:00:00Z", lifted: false }])?.report,
    ).toEqual({ id: "r1", resolvedAt: "2026-10-01T09:00:00Z" });
    expect(recallPreviewFrom([{ audience: 3, category: "fraud" }])?.category).toBeNull();
    expect(recallPreviewFrom([])).toBeNull();
    expect(recallPreviewFrom([{ audience: "14" }])).toBeNull();
  });

  it("says how many people before anything is sent", () => {
    expect(willTell(14, desk)).toBe("This will tell 14 people.");
    expect(willTell(1, desk)).toBe("This will tell 1 person.");
    expect(willTell(0, desk)).toBe(desk.recallNobody);
  });

  it("treats only a clear send as sent", () => {
    expect(recallSendFrom({ status: "sent", recipients: 3 }, desk)).toEqual({ ok: true, recipients: 3 });
    expect(recallSendFrom({ status: "already" }, desk)).toEqual({ ok: false, message: desk.recallAlready });
    expect(recallSendFrom({ status: "lifted" }, desk)).toEqual({ ok: false, message: desk.recallLifted });
    expect(recallSendFrom({ status: "forbidden" }, desk)).toEqual({ ok: false, message: desk.recallForbidden });
    expect(recallSendFrom({ status: "sent" }, desk).ok).toBe(false);
    expect(recallSendFrom({ status: "no_upheld_report" }, desk)).toEqual({ ok: false, message: desk.recallNoReport });
    expect(recallSendFrom({ status: "report_changed" }, desk)).toEqual({ ok: false, message: desk.recallReportChanged });
    expect(recallSendFrom(null, desk).ok).toBe(false);
  });

  it("words the reason only in the two ways the review allowed", () => {
    expect(recallReason("off_platform_payment", desk)).toBe("for asking people to pay outside Vallo");
    expect(recallReason("scam", desk)).toBe("for breaking Vallo's safety rules");
  });

  it("never lets the desk choose the category", () => {
    const panel = readFileSync(join(__dirname, "../../app/admin/stops/RecallPanel.tsx"), "utf8");
    expect(panel).not.toContain("<select");
    const actions = readFileSync(join(__dirname, "recall-actions.ts"), "utf8");
    expect(actions).not.toContain("p_category");
    expect(actions).toContain("p_body_about: desk.recallBodyAbout");
  });

  it("is on the stops desk, under a standing stop, and sends only from its confirm button", () => {
    const desk_ = readFileSync(join(__dirname, "../../app/admin/stops/StopsDesk.tsx"), "utf8");
    expect(desk_).toContain("<RecallPanel suspensionId={stop.id} desk={recallCopy} />");
    const panel = readFileSync(join(__dirname, "../../app/admin/stops/RecallPanel.tsx"), "utf8");
    expect(panel.match(/sendRecall\(/g)?.length).toBe(1);
    expect(panel).toContain("onClick={send}");
    expect(panel.indexOf("willTell(preview.audience, desk)")).toBeLessThan(panel.indexOf("onClick={send}"));
  });

  it("names the report it rests on, and sends only on that report", () => {
    expect(reportRef("1a2b3c4d-0000-4000-8000-000000000001")).toBe("1A2B3C4D");
    expect(desk.recallReport).toContain("{ref}");
    const root = join(__dirname, "..", "..");
    const action = readFileSync(join(root, "lib/admin/recall-actions.ts"), "utf8");
    expect(action).toContain("p_report: parsed.data.reportId");
    const panel = readFileSync(join(root, "app/admin/stops/RecallPanel.tsx"), "utf8");
    expect(panel).toContain("sendRecall({ suspensionId, reportId })");
    expect(panel).toContain('data-testid="recall-report"');
    const sql = readFileSync(
      join(__dirname, "../../../../../supabase/migrations/20260928224613_v60_scam_exposure_recall.sql"),
      "utf8",
    );
    expect(sql).toContain("if p_report is null or rc_report is distinct from p_report then");
    expect(sql).toContain("order by t.uid, (t.conversation_id is not null) desc, t.at desc;");
  });
});
