/**
 * The console's visit calendar, rendered for real from fixtures pinned to
 * Tuesday 13 October 2026: counts per day, both views, the four filters,
 * the detail panel (history, reminders, no-show, links to the listing and
 * the member files, display names only), every empty and refused state, and
 * axe in Chromium.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { ADMIN_ROWS, FIXTURE_ID, TODAY } from "@/app/(dev)/preview/visit-ops/fixtures";
import { readVisitQuery, narrowVisits } from "@/lib/admin/reads/visits-model";
import type { VisitDetail } from "@/lib/admin/reads/visits";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {}, push() {} }), usePathname: () => "/admin/bookings/visits" }));

const { VisitsDesk } = await import("./VisitsDesk");
const copy = getDictionary("en").visitOps;
const a = copy.admin;

afterAll(closeAxe);

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

function render(params: Record<string, string>, detail: VisitDetail | null = null, read?: Parameters<typeof VisitsDesk>[0]["read"]) {
  const query = readVisitQuery(params, TODAY);
  const rows = narrowVisits(ADMIN_ROWS, query);
  return renderToStaticMarkup(
    <VisitsDesk
      query={query}
      today={TODAY}
      read={read ?? { state: "ok", data: { rows, inRange: ADMIN_ROWS.length, cities: ["Abuja", "Lagos"], listers: [] } }}
      detail={detail}
      copy={copy}
      locale="en"
    />,
  );
}

describe("VisitsDesk", () => {
  it("draws the week with a count on each day and every day listed", () => {
    const html = render({});
    expect(text(html)).toContain(a.rangeWeek.replace("{from}", "12 Oct").replace("{to}", "18 Oct 2026"));
    /* Tuesday 13 holds two visits; Sunday 18 none. */
    expect(text(html)).toMatch(/Tue 13 October, 2 visits/);
    expect(text(html)).toMatch(/Sun 18 October, 0 visits/);
    expect((html.match(/class="nf-vcal-agenda"/g) ?? []).length).toBe(7);
    expect(text(html)).toContain("Chiamaka Obi with Tunde Bakare");
    expect(html).toContain('data-testid="desk-readonly"');
  });

  it("draws the month as a grid with counts, and lists the picked day", () => {
    const html = render({ view: "month", day: "2026-10-17" });
    expect(text(html)).toContain("October 2026");
    expect(html).toContain('data-testid="visits-cell-2026-09-28"');
    expect(html).toContain('data-testid="visits-cell-2026-11-01"');
    const picked = html.slice(html.indexOf('data-testid="visits-picked-day"'));
    expect((picked.match(/data-testid="visit-row"/g) ?? []).length).toBe(2);
  });

  it("filters by state, mode, city and lister through the address", () => {
    const html = render({ state: "done" });
    expect((html.match(/data-testid="visit-row"/g) ?? []).length).toBe(2);
    expect(html).toContain('<option value="done" selected="">');
    const video = render({ mode: "video" });
    expect(text(video)).toContain("Ibrahim Musa");
    expect(text(video)).not.toContain("Chiamaka Obi");
    const abuja = render({ city: "Abuja" });
    expect(text(abuja)).toContain("Zainab Yusuf");
    expect(text(abuja)).not.toContain("Funke Adeyemi");
    expect(abuja).toContain(a.clear);
  });

  it("says nothing matches when a filter empties the range, and what fills it when nothing has", () => {
    expect(text(render({ city: "Kano" }))).toContain(a.noMatchTitle);
    const never = render({}, null, { state: "ok", data: { rows: [], inRange: 0, cities: [], listers: [] } });
    expect(text(never)).toContain(a.noneTitle);
  });

  it("says when the visits could not be read, or the range is too big, and draws no calendar", () => {
    const failed = render({}, null, { state: "unavailable" });
    expect(text(failed)).toContain(a.unavailable);
    expect(failed).not.toContain("nf-vcal-strip");
    expect(text(render({}, null, { state: "too-many" }))).toContain(a.tooMany);
  });

  it("opens a visit's detail: names only, links to its listing and both member files, history, reminders and no-show", () => {
    const visit = FIXTURE_ID(9);
    const html = render(
      { day: "2026-10-09", visit },
      {
        reminders: [
          { audience: "renter", stage: "eve", slotAt: "2026-10-09T10:00:00Z", sentAt: "2026-10-08T18:07:00Z" },
          { audience: "lister", stage: "soon", slotAt: "2026-10-09T10:00:00Z", sentAt: "2026-10-09T08:07:00Z" },
        ],
        noShows: [
          { absentRole: "requester", reportedAt: "2026-10-09T12:00:00Z", disputedAt: null, resolvedAt: null, resolution: null },
        ],
      },
    );
    const detail = text(html.slice(html.indexOf('data-testid="visit-detail"')));
    expect(detail).toContain(copy.states.missed);
    expect(detail).toContain("Kunle Afolabi");
    expect(html).toContain(`href="/admin/listings/${FIXTURE_ID(109)}"`);
    expect(html).toContain(`href="/admin/people/${FIXTURE_ID(509)}"`);
    expect(html).toContain(`href="/admin/people/${FIXTURE_ID(900)}"`);
    expect(detail).toContain(a.historySteps.requested);
    expect(detail).toContain(a.historySteps.noShowReported);
    expect(detail).toContain(`${a.reminderStages.eve} ${a.audiences.renter}`);
    expect(detail).toContain(`${a.reminderStages.soon} ${a.audiences.lister}`);
    expect(detail).toContain(a.absentRequester);
    expect(detail).toContain(a.resolutionOpen);
    expect(html).not.toMatch(/@|\+234|mailto:|tel:/);
  });

  it("says the reminders cannot be read until their read policy is applied", () => {
    const html = render({ day: "2026-10-13", visit: FIXTURE_ID(1) }, { reminders: null, noShows: [] });
    expect(text(html)).toContain(a.remindersUnreadable);
    expect(text(html)).toContain(a.noShowNone);
  });

  it.skipIf(!hasBrowser && !process.env.CI)("has no axe violations", async () => {
    expect(await axe(render({}))).toEqual([]);
    expect(await axe(render({ view: "month", visit: FIXTURE_ID(1) }, { reminders: [], noShows: [] }))).toEqual([]);
  });
});
