import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tracker, TrackerBar } from "./Tracker";

const STEPS = [
  { key: "drawn", label: "Drawn up", when: "3 Oct, 09:12", state: "done" as const },
  { key: "confirmed", label: "Both confirmed", when: null, state: "done" as const },
  { key: "approved", label: "Vallo approved", when: null, state: "current" as const },
  { key: "paid", label: "Paid", when: null, state: "upcoming" as const },
];

function html(extra: Partial<Parameters<typeof Tracker>[0]> = {}) {
  return renderToStaticMarkup(
    <Tracker label="Live status" title="With Vallo for review" tone="info" steps={STEPS} timelineLabel="Timeline" {...extra} />,
  );
}

describe("the one tracker", () => {
  it("draws what has happened, newest first, and never the steps still ahead", () => {
    const out = html();
    expect(out.indexOf("Vallo approved")).toBeLessThan(out.indexOf("Both confirmed"));
    expect(out.indexOf("Both confirmed")).toBeLessThan(out.indexOf("Drawn up"));
    expect(out).not.toMatch(/>Paid</);
  });

  it("prints only the dates the record holds, and says the step in progress is in progress", () => {
    const out = html();
    expect(out).toContain("3 Oct, 09:12");
    expect((out.match(/class="nf-tracker__date"><\/span>/g) ?? []).length).toBe(2);
    expect(out).toContain("In progress");
    expect(out).toContain('aria-current="step"');
  });

  it("holds at most two cells", () => {
    const out = html({
      cells: [
        { label: "Next step", value: "Paid" },
        { label: "Your part", value: "No action needed from you" },
        { label: "Extra", value: "never drawn" },
      ],
    });
    expect(out).toContain("No action needed from you");
    expect(out).not.toContain("never drawn");
  });

  it("draws no foot at all when there is neither a conversation nor an action", () => {
    expect(renderToStaticMarkup(<TrackerBar messageLabel="Message" />)).toBe("");
    expect(renderToStaticMarkup(<TrackerBar messageLabel="Message" messageHref="/messages/1" />)).toContain('aria-label="Message"');
  });
});
