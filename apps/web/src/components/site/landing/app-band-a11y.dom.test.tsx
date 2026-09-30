/**
 * The landing's app band and journey without a device frame (29 September).
 *
 * DOC-21 was the reason this file existed: the phone illustration beside the
 * store badges was `aria-hidden` but held a real, focusable listing link
 * (axe `aria-hidden-focus`). The phones are gone, so the band now has no
 * hidden region at all, and the check that stays is the one that matters:
 * nothing a keyboard can reach is hidden, the band reads as a list and a
 * heading, and the journey tells its four steps without a drawn phone.
 */
import { getDictionary } from "@vallo/i18n";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import { NO_CUSTODY_SENTENCE, NO_INSPECTION_FEE, PAYMENT_GATE_SENTENCE } from "@/lib/money/copy";
import { AppBand } from "./AppBand";
import { Journey } from "./Journey";

afterAll(closeAxe);

const t = getDictionary("en");
/* The class names the drawn phones and their screens used. None may return. */
const DEVICE = /nf-(landing-)?phone|nf-jscreen|nf-journey__screen/;

describe("AppBand", () => {
  const html = renderToStaticMarkup(<AppBand t={t} />);

  it("draws no device frame", () => {
    expect(html).not.toMatch(DEVICE);
    /* The shared navy hero band (spec section 16, Q2), one panel. */
    expect(html).toContain("nf-hero-band");
  });

  it("shows both store badges as coming soon while no store URL is set, and every point", () => {
    expect(html).not.toContain(t.landing.face.app.installTitle);
    expect(html.match(/nf-store-badge--soon/g)?.length).toBe(2);
    expect(html).toContain(t.landingRooms.badges.comingSoon);
    /* Not a link until the listing is live. */
    expect(html).not.toMatch(/<a[^>]*nf-store-badge/);
    for (const point of [t.landing.face.app.points.notify, t.landing.face.app.points.sides, t.landing.face.app.points.record]) {
      expect(html).toContain(point);
    }
  });

  it.skipIf(!hasBrowser && !process.env.CI)("hides nothing a keyboard can reach (axe)", async () => {
    expect(await axe(html, { rules: ["aria-hidden-focus", "list", "listitem"], strict: true })).toEqual([]);
  });
});

describe("Journey", () => {
  const html = renderToStaticMarkup(<Journey t={t} />);

  it("tells four numbered steps with no phone", () => {
    expect(html).not.toMatch(DEVICE);
    expect(html.match(/class="nf-step"/g)?.length).toBe(4);
    for (const n of ["01", "02", "03", "04"]) expect(html).toContain(`>${n}<`);
  });

  it("prints the money sentences verbatim", () => {
    for (const sentence of [NO_INSPECTION_FEE, PAYMENT_GATE_SENTENCE, NO_CUSTODY_SENTENCE]) {
      expect(html).toContain(renderToStaticMarkup(<>{sentence}</>));
    }
  });

  it.skipIf(!hasBrowser && !process.env.CI)("is a list with a heading per step (axe)", async () => {
    expect(await axe(html, { rules: ["aria-hidden-focus", "list", "listitem"], strict: true })).toEqual([]);
  });
});
