import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderClient } from "@/lib/testing/render-client";

/**
 * UX-08: the dates are picked on the stay itself. The form posts back to the
 * same address with checkIn/checkOut/guests, which the page already reads;
 * nothing on the page links away to search any more.
 */
describe("dates on the stay page", () => {
  it("is a GET form to the same stay, with today in Lagos as the earliest night", async () => {
    const html = await renderClient(`
      import { renderToStaticMarkup } from "react-dom/server";
      import { StayDatesForm } from "@/app/(app)/stay/[id]/StayDatesForm";
      export const html = () =>
        renderToStaticMarkup(
          <StayDatesForm
            action="/stay/ea000000-0000-4000-8000-000000000001"
            checkIn="2026-10-10"
            checkOut="2026-10-12"
            guests={3}
            copy={{ title: "Your dates", checkIn: "Check in", checkOut: "Check out", guests: "Guests", submit: "Show" }}
          />,
        );
    `);
    expect(html).toContain('id="stay-dates"');
    expect(html).toContain('method="get"');
    expect(html).toContain('action="/stay/ea000000-0000-4000-8000-000000000001"');
    const input = (name: string) => html.match(new RegExp(`<input[^>]*name="${name}"[^>]*>`))?.[0] ?? "";
    for (const [name, value] of [["checkIn", "2026-10-10"], ["checkOut", "2026-10-12"]] as const) {
      expect(input(name)).toContain('type="date"');
      expect(input(name)).toMatch(/min="\d{4}-\d{2}-\d{2}"/);
      expect(input(name)).toContain(`value="${value}"`);
    }
    expect(html).toContain('name="guests"');
    expect(html).toContain('value="3"');
  }, 30_000);

  it("points every date control at the form, never at /stays/search", () => {
    const page = readFileSync(join(__dirname, "page.tsx"), "utf8");
    expect(page).toContain('datesHref="#stay-dates"');
    expect(page).not.toContain("toStaysSearchHref(");
    expect(readFileSync(join(__dirname, "StayDetailView.tsx"), "utf8")).toContain("<StayDatesForm");
  });
});
