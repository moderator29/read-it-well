/**
 * The lister's visit calendar, rendered for real from fixtures pinned to
 * Tuesday 13 October 2026: the three figures, the requests waiting, the week
 * with every day listed by its Lagos date, the rows' state chips and mode
 * glyphs, the empty and refused states, and axe in Chromium.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { LISTER_ROWS, TODAY } from "@/app/(dev)/preview/visit-ops/fixtures";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {}, push() {} }), usePathname: () => "/agent/inspections" }));

const { VisitCalendar } = await import("./VisitCalendar");
const t = getDictionary("en");
const copy = t.visitOps;

afterAll(closeAxe);

function render(props: Partial<Parameters<typeof VisitCalendar>[0]> = {}) {
  return renderToStaticMarkup(
    <VisitCalendar rows={LISTER_ROWS} sheets={{}} today={TODAY} copy={copy} locale="en" {...props} />,
  );
}

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("VisitCalendar", () => {
  const html = render();

  it("leads with Today, Next 7 days and Needs your answer, counted from the rows", () => {
    expect(html).toMatch(/data-testid="visit-sum-today">2</);
    /* Wed asked, Thu asked, Fri proposed, Sat two booked, 22 Oct booked is outside the seven days. */
    expect(html).toMatch(/data-testid="visit-sum-next">5</);
    expect(html).toMatch(/data-testid="visit-sum-needs">2</);
  });

  it("lists the requests waiting on the lister at the top", () => {
    const needs = html.slice(html.indexOf('data-testid="visit-needs-answer"'), html.indexOf('aria-labelledby="vcal-title"'));
    expect((needs.match(/data-testid="visit-row"/g) ?? []).length).toBe(2);
    expect(text(needs)).toContain("Funke Adeyemi");
    /* A renter with no published name is never given one. */
    expect(text(needs)).toContain(copy.calendar.nameNotShared);
  });

  it("draws the week of today, Monday first, every day listed", () => {
    expect(html).toContain(copy.calendar.weekOf.replace("{date}", "12 Oct 2026"));
    const agendas = html.match(/class="nf-vcal-agenda"/g) ?? [];
    expect(agendas.length).toBe(7);
    expect(text(html)).toContain("Monday");
    expect(text(html)).toContain(copy.calendar.dayEmpty);
    expect(html).toMatch(/aria-current="date"[^>]*aria-pressed="true"/);
  });

  it("puts a visit on its Lagos day and draws its time, mode and state", () => {
    expect(text(html)).toContain("Chiamaka Obi");
    expect(text(html)).toContain("10:00"); // 09:00Z is 10:00 in Lagos
    expect(html).toContain(`aria-label="${copy.modes.video}"`);
    for (const word of [copy.states.confirmed, copy.states.requested, copy.states.proposed, copy.states.done]) {
      expect(text(html)).toContain(word);
    }
    expect(text(html)).toContain(copy.calendar.askedFor);
  });

  it("offers All and the five state filters with their counts", () => {
    for (const key of ["requested", "proposed", "confirmed", "done", "missed"] as const) {
      expect(html).toContain(`data-testid="visit-filter-${key}"`);
    }
    expect(html).toMatch(/role="radiogroup"/);
  });

  it("draws the notice instead of the calendar, and keeps the side column", () => {
    const empty = render({ rows: [], notice: <p>{copy.calendar.noneTitle}</p>, aside: <p>windows here</p> });
    expect(empty).toContain(copy.calendar.noneTitle);
    expect(empty).not.toContain('data-testid="visit-sum-today"');
    expect(empty).toContain("windows here");
  });

  it("says the read's cap when it is reached", () => {
    expect(render({ footnote: "Showing your 20 most recent requests, open ones first." })).toContain("Showing your 20");
  });

  it.skipIf(!hasBrowser && !process.env.CI)("has no axe violations", async () => {
    expect(await axe(`<h1>Inspections</h1>${html}`)).toEqual([]);
    expect(await axe(`<h1>Inspections</h1>${render({ initialView: "month" })}`)).toEqual([]);
  });
});
