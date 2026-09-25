import { describe, expect, it } from "vitest";
import { formatMoney } from "@vallo/i18n/core";
import { renderClient } from "@/lib/testing/render-client";
import { nairaExact } from "./money";

/** UI-13: an abbreviation may hide the tail of a figure, never change it. */
describe("money at the edges", () => {
  it("writes small amounts in full rather than rounding kobo away", () => {
    expect(formatMoney(1, "en", "NGN", { compact: true })).toBe("₦0.01");
    expect(formatMoney(99, "en", "NGN", { compact: true })).toBe("₦0.99");
    expect(formatMoney(-50, "en", "NGN", { compact: true })).toBe("-₦0.50");
    expect(formatMoney(99_900, "en", "NGN", { compact: true })).toBe("₦999");
  });

  it("never rounds up across a magnitude", () => {
    expect(formatMoney(99_999_999, "en", "NGN", { compact: true })).toBe("₦999.9k");
    expect(formatMoney(1_470_000_000, "en", "NGN", { compact: true })).toBe("₦14.7m");
    expect(formatMoney(100_000_000, "en", "NGN", { compact: true })).toBe("₦1m");
    expect(formatMoney(100_000, "en", "NGN", { compact: true })).toBe("₦1k");
  });

  it("keeps the sign on an exact figure", () => {
    expect(nairaExact(-100_050)).toBe("-₦1,000.50");
    expect(nairaExact(100_050)).toBe("₦1,000.50");
    expect(nairaExact(-100_000)).toBe("-₦1,000");
  });

  it("shows kobo on <Amount> when there is kobo, by default", async () => {
    const html = await renderClient(`
      import { renderToStaticMarkup } from "react-dom/server";
      import { Amount } from "@/components/ui/Amount";
      const cases = [
        { minorUnits: 4200075 },
        { minorUnits: 4200000 },
        { minorUnits: 4200000, showFraction: true },
        { minorUnits: 1, compact: true },
        { minorUnits: 99999999, compact: true },
      ];
      export const html = () => cases.map((c) => renderToStaticMarkup(<Amount {...c} />)).join("|");
    `);
    const texts = html.replace(/<[^>]+>/g, "").split("|");
    expect(texts).toEqual(["₦42,000.75", "₦42,000", "₦42,000.00", "₦0.01", "₦999.9k"]);
  }, 30_000);
});
