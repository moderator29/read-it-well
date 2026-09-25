import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LOCALES, formatMoney, moneyParts } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";

/**
 * THE SAME PRICE, WHEREVER IT IS DRAWN.
 *
 * Chromium's locale data has no naira sign for yo-NG, ha-NG or ig-NG and
 * wrote "NGN 4,500,000" where the server (Node) wrote "₦4,500,000", and Node
 * put a space after the sign in Hausa where Chromium did not. Every price on
 * a Yoruba, Hausa or Igbo page was therefore a hydration mismatch. These
 * pin what the shared parts must produce in every language: the sign, and no
 * space beside it. (This suite runs in Node; the browser half was checked
 * against Chromium when the fix went in, and `narrowSymbol` is the reason
 * the two now agree.)
 */
describe("money is written the same in every language", () => {
  it.each(LOCALES)("%s: the naira sign, no NGN, no space", (locale) => {
    expect(formatMoney(450_000_000, locale)).toBe("₦4,500,000");
    expect(formatMoney(450_000_000, locale, "NGN", { compact: true })).toBe(
      "₦4.5m"
    );
    expect(formatMoney(-4_200_075, locale)).toBe("-₦42,000.75");
  });

  it.each(LOCALES)(
    "%s: no whitespace part survives beside the sign",
    (locale) => {
      const parts = moneyParts(4_500_000, locale, "NGN", {});
      const at = parts.findIndex((part) => part.type === "currency");
      expect(parts[at]?.value).toBe("₦");
      expect(parts[at + 1]?.value).not.toMatch(/^\s+$/);
    }
  );

  it.each(LOCALES)("%s: <Amount> draws the same figure", (locale) => {
    const html = renderToStaticMarkup(
      <Amount minorUnits={450_000_000} locale={locale} />
    );
    expect(html.replace(/<[^>]+>/g, "")).toBe("₦4,500,000");
  });
});
