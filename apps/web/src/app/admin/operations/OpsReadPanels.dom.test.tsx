import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DbJobsPanel, DeletionsPanel, EmailOutboxPanel, HeldEventsPanel, ReconPanel, TransfersPanel } from "./OpsReadPanels";

const missing = <p data-testid="old-note">Not readable by an admin yet</p>;
const base = { title: "Panel", missing, locale: "en" as const };

describe("the Operations read panels", () => {
  it("keep the old note while the function is missing (or the read was not passed)", () => {
    for (const read of [{ state: "missing" as const }, undefined]) {
      const html = renderToStaticMarkup(<DeletionsPanel {...base} read={read} />);
      expect(html).toContain("Not readable by an admin yet");
    }
    expect(renderToStaticMarkup(<TransfersPanel {...base} read={{ state: "missing" }} />)).toContain("old-note");
    expect(renderToStaticMarkup(<DbJobsPanel {...base} read={{ state: "missing" }} />)).toContain("old-note");
    expect(renderToStaticMarkup(<ReconPanel {...base} read={{ state: "missing" }} />)).toContain("old-note");
    expect(renderToStaticMarkup(<EmailOutboxPanel missing={missing} locale="en" read={{ state: "missing" }} />)).toContain("old-note");
    expect(renderToStaticMarkup(<HeldEventsPanel missing={missing} locale="en" read={{ state: "missing" }} />)).toContain("old-note");
  });

  it("say so when a read failed, not that nothing is there", () => {
    const html = renderToStaticMarkup(<EmailOutboxPanel missing={missing} locale="en" read={{ state: "unavailable" }} />);
    expect(html).not.toContain("old-note");
    expect(html).not.toContain("Nothing waiting");
    expect(html).toContain("role=\"alert\"");
  });

  it("show a calm empty state, and a count badge only when something waits", () => {
    const empty = renderToStaticMarkup(
      <DeletionsPanel {...base} read={{ state: "ok", data: { byStatus: {}, rows: [], waiting: 0 } }} />,
    );
    expect(empty).toContain("No deletion waiting");
    expect(empty).not.toMatch(/\d+ waiting/);
    const waiting = renderToStaticMarkup(
      <DeletionsPanel
        {...base}
        read={{ state: "ok", data: { byStatus: { SCHEDULED: 2 }, waiting: 2, rows: [{ memberRef: "ab12cd34", status: "SCHEDULED", requestedAt: "2026-10-01T09:00:00Z", purgeAfter: "2026-10-31T09:00:00Z", attempts: 0, lastError: null }] } }}
      />,
    );
    expect(waiting).toContain("2 waiting");
    expect(waiting).toContain("Account ab12cd34");
  });

  it("badge the failing database jobs and the held events", () => {
    const jobs = renderToStaticMarkup(
      <DbJobsPanel
        {...base}
        read={{ state: "ok", data: { available: true, failing: 1, jobs: [{ name: "vallo_push_drain", schedule: "*/5 * * * *", active: true, lastStatus: "failed", lastStart: "2026-10-13T10:00:00Z", lastMs: 40, lastMessage: "boom", failed24h: 3 }] } }}
      />,
    );
    expect(jobs).toContain("1 failing");
    expect(jobs).toContain("vallo_push_drain");
    expect(jobs).toContain("Failed");
    const held = renderToStaticMarkup(
      <HeldEventsPanel
        missing={missing}
        locale="en"
        read={{ state: "ok", data: { heldCount: 1, held: [{ id: "e1", title: "Rooftop night", host: "Ada", reason: "Flagged wording", createdAt: "2026-10-13T08:00:00Z", startsAt: null }], decisions: [] } }}
      />,
    );
    expect(held).toContain("1 held");
    expect(held).toContain("Rooftop night");
    expect(held).toContain("No decision recorded");
  });
});

describe("the Operations tabs", () => {
  const view = readFileSync(join(__dirname, "OperationsView.tsx"), "utf8");
  const page = readFileSync(join(__dirname, "page.tsx"), "utf8");
  it("read the staff functions on the page and pass them down", () => {
    expect(page).toContain("getOpsReads");
    expect(page).toContain("ops={ops}");
    expect(view).toContain("inFlightWaiting(props.ops)");
    expect(view).toContain("outboxWaiting(props.ops)");
  });
});
