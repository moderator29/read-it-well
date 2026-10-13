import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";

import type { HostReservationView } from "@/lib/reservations/queries";

/**
 * The table desk, drawn to markup from a fixture board on a fixed clock: the
 * request card carries the party, the time, the note, the guest record line
 * and Confirm or Decline; a first-time diner gets no record line; today's four
 * figures are the counts of the rows on the screen.
 *
 * The actions are server actions; nothing here calls them, so they are stubbed
 * to keep the database client out of the render.
 */
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/lib/reservations/actions", () => ({ respondToReservation: vi.fn(), markReservationOutcome: vi.fn() }));
vi.mock("@/lib/reservations/seating-actions", () => ({
  confirmTableBill: vi.fn(),
  enterTableBill: vi.fn(),
  seatByCode: vi.fn(),
}));

const { HostReservationsBoard } = await import("./ReservationsBoard");
const { CopyScope } = await import("@/lib/i18n/copy-scope");

afterAll(closeAxe);

/* 18:00 Lagos, Tuesday 13 October 2026. */
const NOW = "2026-10-13T17:00:00.000Z";
const at = (lagos: string) => new Date(`${lagos}+01:00`).toISOString();

function row(id: string, over: Partial<HostReservationView>): HostReservationView {
  return {
    id,
    listingId: null,
    businessId: "b-1",
    listingTitle: "Yellow Chilli Ikoyi",
    location: "Ikoyi, Lagos",
    reservedFor: at("2026-10-13T21:00:00"),
    partySize: 2,
    status: "PENDING",
    note: null,
    respondedAt: null,
    conversationId: null,
    cancellable: true,
    guestId: `g-${id}`,
    guestName: "Vallo guest",
    awaitingAnswer: true,
    guestRecord: null,
    ...over,
  };
}

const t = getDictionary("en");

function draw(rows: { requests?: HostReservationView[]; upcoming?: HostReservationView[]; past?: HostReservationView[] }) {
  const board = {
    requests: rows.requests ?? [],
    upcoming: rows.upcoming ?? [],
    past: rows.past ?? [],
    total: (rows.requests?.length ?? 0) + (rows.upcoming?.length ?? 0) + (rows.past?.length ?? 0),
  };
  return renderToStaticMarkup(
    <CopyScope copy={{ experienceHost: t.experienceHost }}>
      <HostReservationsBoard
        board={board}
        words={t.tableDesk}
        now={NOW}
        locale="en"
        title={{ heading: "Tables", line: "", date: "Tuesday, 13 October" }}
      />
    </CopyScope>,
  );
}

/** One card's markup, by the guest's name. */
function card(html: string, name: string): string {
  const cards = html.split('data-testid="desk-table"').slice(1);
  const hit = cards.find((c) => c.includes(name));
  if (!hit) throw new Error(`no card for ${name}`);
  return hit;
}

describe("the table desk, drawn", () => {
  const html = draw({
    requests: [
      row("r1", {
        guestName: "Tunde Bakare",
        partySize: 4,
        note: "One of us cannot have peanuts.",
        guestRecord: { kept: 4, missed: 1 },
      }),
      row("r2", { guestName: "Ifeoma Nwosu", reservedFor: at("2026-10-14T19:00:00") }),
    ],
    upcoming: [
      row("c1", { guestName: "Chidi Okonkwo", status: "CONFIRMED", partySize: 6, reservedFor: at("2026-10-13T19:30:00"), awaitingAnswer: false }),
    ],
  });

  it("shows a request with its time, party, note, guest record and both answers", () => {
    const tunde = card(html, "Tunde Bakare");
    expect(tunde).toContain("21:00");
    expect(tunde).toContain("4 guests");
    expect(tunde).toContain("One of us cannot have peanuts.");
    expect(tunde).toContain("Kept 4 tables, missed 1 table, last 12 months");
    expect(tunde).toContain(">Confirm<");
    expect(tunde).toContain(">Decline<");
  });

  it("says nothing about a first-time diner's record", () => {
    const ifeoma = card(html, "Ifeoma Nwosu");
    expect(ifeoma).not.toContain('data-testid="guest-record"');
    expect(ifeoma).toContain(">Confirm<");
  });

  it("offers no answer on a confirmed table and shows no record line on it", () => {
    const chidi = card(html, "Chidi Okonkwo");
    expect(chidi).not.toContain(">Confirm<");
    expect(chidi).not.toContain('data-testid="guest-record"');
    expect(chidi).toContain("Confirmed");
  });

  it("puts Today first, then Upcoming, with the day's figures", () => {
    expect(html.indexOf(">Today")).toBeLessThan(html.indexOf(">Upcoming"));
    expect(html).toContain("Covers expected");
    /* Six guests at the one confirmed table tonight. */
    expect(html).toContain("across 1 table");
    expect(html).toContain("1 more after today");
    expect(html).toContain('data-testid="desk-search"');
  });

  it.skipIf(!hasBrowser)("names every control, labels the search and keeps its lists well formed", async () => {
    const violations = await axe(html, {
      rules: ["button-name", "label", "link-name", "list", "listitem", "aria-allowed-attr", "duplicate-id"],
    });
    expect(violations).toEqual([]);
  });

  it("draws a quiet empty Today rather than nothing at all", () => {
    const later = draw({ requests: [row("r3", { reservedFor: at("2026-10-15T20:00:00") })] });
    expect(later).toContain(t.tableDesk.todayEmpty);
  });
});
