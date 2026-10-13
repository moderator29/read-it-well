import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";

/**
 * The hotel and restaurant dashboards, drawn to markup from fixtures on a
 * fixed clock (10:00 Lagos, Tuesday 13 October 2026). The check-in action is a
 * server action; nothing here calls it, so it is stubbed to keep the database
 * client out of the render.
 */
vi.mock("@/lib/host/front-desk-actions", () => ({ markStay: vi.fn() }));

const { HotelDashboard } = await import("./HotelDashboard");
const { RestaurantSummary } = await import("./RestaurantSummary");
const { buildRestaurantFigures } = await import("./restaurant-figures");
const { emptyHotelRead, hotelRead, WEEK_ROWS } = await import("@/app/(dev)/preview/hospitality/fixtures");
const { DESK_EMPTY, DESK_NOW, deskFixture } = await import("@/app/(dev)/preview/restaurant-desk/fixtures");

afterAll(closeAxe);

const t = getDictionary("en");

const hotel = (variant: "home" | "page", read = hotelRead()) =>
  renderToStaticMarkup(<HotelDashboard read={read} locale="en" variant={variant} t={t} />);

const restaurant = (empty = false) =>
  renderToStaticMarkup(
    <RestaurantSummary
      figures={buildRestaurantFigures({
        board: empty ? DESK_EMPTY : deskFixture(),
        now: DESK_NOW,
        week: empty ? [] : WEEK_ROWS,
        noShowsMonth: empty ? 0 : 3,
      })}
      words={t.hostDash.restaurant}
      locale="en"
    />,
  );

describe("the hotel dashboard", () => {
  const page = hotel("page");

  it("draws the five cards from the rows", () => {
    for (const label of [
      t.hostDash.hotel.arrivals,
      t.hostDash.hotel.inHouse,
      t.hostDash.hotel.departures,
      t.hostDash.hotel.occupancy,
      t.hostDash.hotel.revenue,
    ]) {
      expect(page).toContain(label);
    }
    /* 7 of the 21 rooms are held tonight; the month's payments are named in naira. */
    expect(page).toContain("7 of 21 rooms booked");
    /* The card is what the hotel received, from the settled split: the charge
       less Vallo's share, with both named under it. */
    expect(page).toContain(t.hostDash.hotel.revenue);
    expect(page).toContain("4,338,000");
    expect(page).toContain("4,820,000 paid by guests");
    expect(page).toContain("482,000 to Vallo");
  });

  it("draws the three front desk lists, each row with its one button", () => {
    expect(page).toContain('data-testid="front-desk-arriving"');
    expect(page).toContain('data-testid="front-desk-inHouse"');
    expect(page).toContain('data-testid="front-desk-leaving"');
    expect(page.match(/data-testid="check-in"/g)?.length).toBe(3);
    expect(page.match(/data-testid="check-out"/g)?.length).toBe(4);
    expect(page).toContain("Adaeze Okafor");
  });

  it("draws the tape chart with a group per room type, a bar per stay in the window, and only the supported chips", () => {
    expect(page.match(/data-testid="tape-group"/g)?.length).toBe(3);
    expect(page.match(/data-testid="tape-bar"/g)?.length).toBeGreaterThan(10);
    for (const key of ["all", "vacant", "occupied", "dueOut"]) expect(page).toContain(`data-testid="tape-filter-${key}"`);
    /* Nothing records a room as dirty or out of order, so there is no chip for either. */
    expect(page).not.toMatch(/Dirty|Out of order/);
  });

  it("names the guest on each bar and leaves out the rooms off sale from the available count", () => {
    expect(page).toContain("Tunde Bakare");
    expect(page).toContain(t.hostDash.tape.legendOffSale);
  });

  it("turns the buttons off and says why when the check-in marks cannot be read", () => {
    const missing = hotel("page", hotelRead({ marks: "missing" }));
    expect(missing).toContain(t.hostDash.desk.notAvailable);
    expect(missing).not.toContain("data-testid=\"front-desk-marked\"");
    const buttons = missing.match(/<button[^>]*data-testid="check-(?:in|out)"[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toContain("disabled");

    const failed = hotel("page", hotelRead({ marks: "error" }));
    expect(failed).toContain(t.hostDash.desk.unreadable);
  });

  it("shows a dash, not a zero, for a figure that could not be read", () => {
    const noRevenue = hotel("page", hotelRead({ revenue: false }));
    expect(noRevenue).toContain(t.hostDash.hotel.revenueUnavailable);
  });

  it("says there are no rooms yet instead of drawing an empty grid", () => {
    const empty = hotel("page", emptyHotelRead());
    expect(empty).toContain(t.hostDash.tape.emptyTitle);
    expect(empty).not.toContain('data-testid="tape-group"');
  });

  it("is the same cards and desk on the home, with a door to the calendar instead of the chart", () => {
    const home = hotel("home");
    expect(home).toContain('data-testid="open-calendar"');
    /* Vallo's fee on a paid room, said plainly under the cards. */
    expect(home).toContain('data-testid="hotel-fee"');
    expect(home).toContain("taken from your share");
    expect(home).not.toContain('data-testid="tape-chart"');
    /* Four rows a list at most on the home. */
    expect(home.match(/data-testid="front-desk-row"/g)?.length).toBeLessThanOrEqual(12);
  });

  it.skipIf(!hasBrowser)("names every control and keeps its lists well formed", async () => {
    const violations = await axe(page, {
      rules: ["button-name", "link-name", "list", "listitem", "aria-allowed-attr", "aria-valid-attr", "duplicate-id"],
    });
    expect(violations).toEqual([]);
  });
});

describe("the restaurant home", () => {
  const html = restaurant();

  it("draws today's four figures, the week and today's tables", () => {
    for (const label of [t.hostDash.restaurant.covers, t.hostDash.restaurant.toConfirm, t.hostDash.restaurant.seated, t.hostDash.restaurant.noShows]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('data-testid="restaurant-week"');
    expect(html).toContain("43 tables booked");
    expect(html).toContain("Chidi Okonkwo");
    expect(html).toContain("/host/reservations");
  });

  it("draws no table grid: there is no table record to draw it from", () => {
    expect(html).not.toMatch(/table-grid|Table 1\b|restaurant_tables/i);
  });

  it("says a venue with no tables has none", () => {
    const empty = restaurant(true);
    expect(empty).toContain(t.hostDash.restaurant.emptyTitle);
    expect(empty).not.toContain('data-testid="restaurant-week"');
  });

  it("says the week could not be read, rather than drawing a flat line", () => {
    const html2 = renderToStaticMarkup(
      <RestaurantSummary
        figures={buildRestaurantFigures({ board: deskFixture(), now: DESK_NOW, week: null, noShowsMonth: null })}
        words={t.hostDash.restaurant}
        locale="en"
      />,
    );
    expect(html2).toContain(t.hostDash.restaurant.weekUnavailable);
    expect(html2).toContain(t.hostDash.restaurant.noShowsUnavailable);
  });

  it.skipIf(!hasBrowser)("names every control and keeps its lists well formed", async () => {
    const violations = await axe(html, {
      rules: ["button-name", "link-name", "list", "listitem", "aria-allowed-attr", "duplicate-id"],
    });
    expect(violations).toEqual([]);
  });
});
