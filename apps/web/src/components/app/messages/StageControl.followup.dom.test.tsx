import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getDictionary } from "@vallo/i18n";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/enquiry/actions", () => ({ setEnquiryStage: vi.fn() }));
vi.mock("@/lib/enquiry/followup-actions", () => ({ setEnquiryFollowup: vi.fn() }));

import { StageControl } from "./StageControl";

const t = getDictionary("en");
const stage = { stage: "replied", lostReason: null, source: "proven" } as const;
const ID = "0b5d0c38-1d2e-4e6b-8f5e-5f1d1c2a9b10";

function html(followup?: { dueOn: string | null; note: string | null }) {
  return renderToStaticMarkup(
    <StageControl
      conversationId={ID}
      stage={stage}
      copy={t.frontDoor.desk}
      {...(followup ? { followup, today: "2026-10-13", followupCopy: t.workspaceDash.followup, locale: "en" as const } : {})}
    />,
  );
}

/* The form's rules (today to a year ahead, 200 characters, clearing) are
   tested where they live: lib/enquiry/followup.test.ts, the action's test and
   the database probe. This holds what the lister reads at rest. */
describe("the follow-up beside the stage, at rest", () => {
  it("says none is set, and offers to set a date", () => {
    const out = html({ dueOn: null, note: null });
    expect(out).toContain('data-testid="enquiry-followup"');
    expect(out).toContain("Follow up on");
    expect(out).toContain("No follow-up set");
    expect(out).toContain("Set date");
  });

  it("shows the date in words and the note when one is set", () => {
    const out = html({ dueOn: "2026-10-20", note: "ring about the lease" });
    expect(out).toContain("Follow up on 20 Oct 2026");
    expect(out).toContain("ring about the lease");
    expect(out).not.toContain("No follow-up set");
  });

  it("does not show a note that belongs to a cleared date", () => {
    expect(html({ dueOn: null, note: "stale" })).not.toContain("stale");
  });

  it("draws no follow-up row when the page passes none (the stage control as it was)", () => {
    const out = html();
    expect(out).not.toContain("enquiry-followup");
    expect(out).toContain('data-testid="enquiry-stage"');
  });
});
