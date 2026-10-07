/**
 * The chat card, mounted for real in Chromium on the product's own thread
 * stylesheet and checked with axe (W12 F26). Two faults were found on the
 * thread-booking card: the rating's `aria-label` sat on a bare `span`, which
 * names nothing without a role, and the check in, check out and guests facts
 * were `dl > div > div > dt` with the glyph in the group, so axe counted seven
 * orphan `dt`. The facts are now `dl > div > dt + dd` with the glyph inside
 * the `dt`, and the glyph still sits on the label's line.
 *
 * Fixtures are slot names; the only numbers are a rating and a party of two.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { axeViolations } from "@/components/ui/ported-test-css";
import { GLASS_CSS, productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(GLASS_CSS, "app/css/threads.css");

const BOOKING = {
  kind: "booking",
  id: "booking-slot",
  listingId: "listing-slot",
  title: "A place name slot",
  area: "An area slot",
  city: "A city slot",
  photo: null,
  hue: 210,
  listingKind: "stay",
  status: "CONFIRMED",
  statusLabel: "Confirmed",
  checkInLabel: "A check in slot",
  checkOutLabel: "A check out slot",
  partyLines: ["2 adults", "1 child"],
  roomName: "A room slot",
  features: ["A feature slot"],
  totalLabel: "A total slot",
  nightsLabel: "A nights slot",
  rating: 4,
};

const LISTING = {
  kind: "listing",
  id: "listing-slot",
  title: "A place name slot",
  area: "An area slot",
  city: "A city slot",
  photo: null,
  hue: 210,
  listingKind: "rent",
  verified: true,
  priceLabel: "A price slot",
  periodLabel: "A period slot",
  bedrooms: 2,
  bathrooms: 1,
  rating: 4,
};

const entry = (cards: unknown[]) => `
  import { ChatCard } from "@/components/app/messages/ChatCard";
  import { mount } from "@/lib/testing/browser-root";
  mount(
    <div style={{ width: 360, padding: 16, display: "grid", gap: 12 }}>
      {${JSON.stringify(cards)}.map((card, i) => <ChatCard key={i} card={card} />)}
    </div>,
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the chat card", () => {
  it("names its rating as an image and holds its facts as a valid definition list", async () => {
    const { page, close } = await mountInBrowser({ entry: entry([BOOKING, LISTING]), css: CSS });
    try {
      /* Both cards carry a rating: each is one image with the sentence as its name. */
      const stars = page.locator(".nf-chat-card__stars");
      expect(await stars.count()).toBe(2);
      expect(await stars.evaluateAll((els) => els.map((el) => [el.getAttribute("role"), el.getAttribute("aria-label")]))).toEqual([
        ["img", "Rated 4 out of 5"],
        ["img", "Rated 4 out of 5"],
      ]);

      /* The facts: every child of the list is a group, every child of a group is a dt or a dd. */
      const shape = await page.evaluate(() => {
        const list = document.querySelector(".nf-chat-card__facts")!;
        const groups = [...list.children];
        return {
          listChildren: groups.map((el) => el.tagName),
          groupChildren: groups.map((el) => [...el.children].map((child) => child.tagName)),
          dts: list.querySelectorAll("dt").length,
          strayDts: [...document.querySelectorAll("dt")].filter((dt) => !dt.parentElement || !["DL", "DIV"].includes(dt.parentElement.tagName)).length,
        };
      });
      expect(shape.listChildren).toEqual(["DIV", "DIV", "DIV"]);
      expect(shape.groupChildren).toEqual([["DT", "DD"], ["DT", "DD"], ["DT", "DD", "DD"]]);
      expect(shape.dts).toBe(3);
      expect(shape.strayDts).toBe(0);

      /* The look: each glyph still sits on its label's line, inside the cell. */
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll(".nf-chat-card__fact")].map((fact) => {
          const dt = fact.querySelector("dt")!.getBoundingClientRect();
          const svg = fact.querySelector("dt svg")!.getBoundingClientRect();
          const cell = fact.getBoundingClientRect();
          return {
            centred: Math.abs(svg.top + svg.height / 2 - (dt.top + dt.height / 2)) <= 1,
            inside: svg.left >= cell.left && svg.right <= cell.right,
            valueBelow: fact.querySelector("dd")!.getBoundingClientRect().top >= dt.bottom - 1,
          };
        }),
      );
      expect(rows).toEqual([
        { centred: true, inside: true, valueBelow: true },
        { centred: true, inside: true, valueBelow: true },
        { centred: true, inside: true, valueBelow: true },
      ]);

      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });
});
