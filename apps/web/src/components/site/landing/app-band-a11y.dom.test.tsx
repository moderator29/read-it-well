/**
 * DOC-21: the landing page's phone illustration was `aria-hidden` but held a
 * real, focusable listing link (axe `aria-hidden-focus`): a keyboard user
 * tabbed into a region a screen reader said was not there.
 */
import { getDictionary } from "@vallo/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { AppBand } from "./AppBand";

afterAll(closeAxe);

describe.skipIf(!hasBrowser && !process.env.CI)("AppBand (axe)", () => {
  it("the hidden phone illustration holds nothing a keyboard can reach", async () => {
    const html = renderToStaticMarkup(
      <AppBand
        t={getDictionary("en")}
        locale="en"
        listing={{
          id: "l1",
          href: "/listing/l1",
          title: "Two bedroom flat, Yaba",
          place: "Yaba, Lagos",
          priceMinor: 250_000_000,
          currency: "NGN",
          suffix: "/year",
          photo: null,
          hue: 200,
          kind: "apartment",
          verified: false,
          market: "To rent",
        }}
      />,
    );
    expect(html).toContain("nf-landing-phones");
    /* The card's media box as the landing stylesheet sizes it: without a box
       the link has no area and axe does not count it as reachable. */
    const css = `.nf-landing-float-media{position:relative;width:180px;height:120px}`;
    expect(await axe(html, { rules: ["aria-hidden-focus"], css, strict: true })).toEqual([]);
  });
});
