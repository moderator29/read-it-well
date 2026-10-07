/**
 * The invite door, `/join/<code>`, read in Chromium on the door's own
 * stylesheets (`public-doors.css` for the column, `join.css` for the Island)
 * and the container tiers. The page is an async server component over one
 * database lookup, so it is called as the function it is with that lookup
 * stubbed, and the markup it produces is what the browser is shown.
 *
 * What a stranger who arrives by an invite link is held to:
 *
 *   - ONE Island holds the gift, the line that says who sent it and the two
 *     doors; the mark and the no-reward line stay outside it;
 *   - it names the inviter by the first word the database gave and nothing more,
 *     promises no reward, and an unknown or malformed code still lets the person
 *     join (the code is kept only when the database did not say no);
 *   - the entrance is CSS, once: the island rises 16px, the gift settles first on
 *     a small overshoot and its words follow 60ms apart; reduced motion and Calm
 *     get a 160ms fade; Off gets the page as it is;
 *   - axe passes, once settled.
 *
 * Fixtures: the inviter is the word "Inviter" (a role, never a name) and codes
 * are well-formed shapes, not allotted codes.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getDictionary } from "@vallo/i18n";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { axeViolations } from "@/components/ui/ported-test-css";
import { GLASS_CSS, productCss } from "@/lib/testing/product-css";

const db = vi.hoisted(() => ({ door: null as { found: boolean; firstName: string | null } | null }));
vi.mock("@/lib/referral/server", () => ({ inviteDoor: async () => db.door }));
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
import JoinPage from "./[code]/page";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(
  GLASS_CSS,
  "app/css/base.css",
  "app/css/typography.css",
  "app/css/controls.css",
  "app/css/public-doors.css",
  "app/join/join.css",
);
const COPY = getDictionary("en").publicDoors.invite;

/* A well-formed code: six characters from the allotted alphabet. */
const CODE = "K7M2QX";

async function door(code: string, answer: { found: boolean; firstName: string | null } | null) {
  db.door = answer;
  const html = renderToStaticMarkup(await JoinPage({ params: Promise.resolve({ code }) }));
  return `
    import { mount } from "@/lib/testing/browser-root";
    mount(<div dangerouslySetInnerHTML={{ __html: ${JSON.stringify(html)} }} />);
  `;
}

const island = (page: Page) => page.locator(".nf-join__island");
const hrefs = (page: Page) =>
  island(page).getByRole("link").evaluateAll((els) => els.map((el) => [el.textContent?.trim(), el.getAttribute("href")]));

const arrival = (page: Page) =>
  page.evaluate(() => {
    const read = (el: Element) => {
      const s = getComputedStyle(el);
      return { name: s.animationName, duration: s.animationDuration, delay: s.animationDelay, count: s.animationIterationCount };
    };
    const root = document.querySelector(".nf-join__island")!;
    return {
      island: read(root),
      gift: read(root.querySelector(".nf-join__gift")!),
      words: [...root.children].filter((el) => !el.classList.contains("nf-join__gift")).map(read),
    };
  });

describe.skipIf(!hasBrowser && !process.env.CI)("the invite door", () => {
  it("holds the gift, who sent it and the two doors in one Island, with the mark and the no-reward line outside it", async () => {
    const { page, close } = await mountInBrowser({ entry: await door(CODE, { found: true, firstName: "Inviter" }), css: CSS });
    try {
      expect(await page.locator(".nf-island").count()).toBe(1);
      expect(await page.locator(".nf-panel").count()).toBe(0);
      const isl = island(page);
      expect(await isl.getAttribute("aria-labelledby")).toBe("join-title");
      const radius = await isl.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius));
      expect(radius).toBeGreaterThanOrEqual(26);
      expect(radius).toBeLessThanOrEqual(32);
      /* The gift is decoration; the title is the island's name. */
      expect(await isl.locator(".nf-join__gift").getAttribute("aria-hidden")).toBe("true");
      expect(await isl.getByRole("heading", { level: 1 }).textContent()).toBe(COPY.doorTitle.replace("{name}", "Inviter"));
      /* The mark and the line beneath are outside the island. */
      expect(
        await page.locator(".nf-door-page").evaluate((col) => {
          const mark = col.children[0]!;
          const inside = col.querySelector(".nf-join__island")!;
          return { first: mark !== inside, outside: !inside.contains(mark), child: inside.parentElement === col };
        }),
      ).toEqual({ first: true, outside: true, child: true });
      expect(await page.locator(".nf-door-page > p").last().textContent()).toBe(COPY.noReward);
      expect(await isl.getByText(COPY.noReward, { exact: true }).count()).toBe(0);
      /* Two doors, one primary. */
      expect(await isl.locator(".nf-btn--primary").count()).toBe(1);
      expect(await isl.getByRole("link").count()).toBe(2);
      for (const h of await isl.getByRole("link").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
        expect(h).toBeGreaterThanOrEqual(44);
      }
    } finally {
      await close();
    }
  });

  it("names the inviter and promises no reward and no figure of any kind", async () => {
    const { page, close } = await mountInBrowser({ entry: await door(CODE, { found: true, firstName: "Inviter" }), css: CSS });
    try {
      const said = (await page.locator("main").innerText()).toLowerCase();
      expect(said).toContain("inviter");
      expect(said).not.toMatch(/₦|\d|bonus|earn|credit|cash|free|discount/);
      expect(await island(page).textContent()).not.toContain(COPY.doorUnknown);
    } finally {
      await close();
    }
  });

  it("keeps the code on its way to sign-up when the database knows it, and says nothing about an unknown inviter", async () => {
    const { page, close } = await mountInBrowser({ entry: await door(CODE, { found: true, firstName: "Inviter" }), css: CSS });
    try {
      expect(await hrefs(page)).toEqual([
        [COPY.doorStart, `/join/${CODE}/start`],
        [COPY.doorSignIn, "/sign-in"],
      ]);
    } finally {
      await close();
    }
  });

  it("when the limiter refused the lookup, names nobody but still keeps a well-formed code", async () => {
    const { page, close } = await mountInBrowser({ entry: await door(CODE, null), css: CSS });
    try {
      expect(await island(page).getByRole("heading", { level: 1 }).textContent()).toBe(COPY.doorTitleNoName);
      expect(await island(page).textContent()).not.toContain(COPY.doorUnknown);
      expect((await hrefs(page))[0]).toEqual([COPY.doorStart, `/join/${CODE}/start`]);
    } finally {
      await close();
    }
  });

  it("lets a person join with a code the database does not know, or one that is not a code at all, and drops the code", async () => {
    for (const [raw, answer] of [
      [CODE, { found: false, firstName: null }],
      ["not-a-code", null],
    ] as const) {
      const { page, close } = await mountInBrowser({ entry: await door(raw, answer), css: CSS });
      try {
        expect(await island(page).getByRole("heading", { level: 1 }).textContent(), raw).toBe(COPY.doorTitleNoName);
        expect(await island(page).textContent(), raw).toContain(COPY.doorUnknown);
        expect((await hrefs(page))[0], raw).toEqual([COPY.doorStart, "/sign-up"]);
        await page.waitForTimeout(900);
        expect(await axeViolations(page), raw).toEqual([]);
      } finally {
        await close();
      }
    }
  });

  it("arrives once with a rise, the gift settling first and its words 60ms apart, when motion is allowed", async () => {
    const { page, close } = await mountInBrowser({ entry: await door(CODE, { found: true, firstName: "Inviter" }), css: CSS });
    try {
      const a = await arrival(page);
      expect(a.island).toEqual({ name: "nf-join-rise", duration: "0.52s", delay: "0s", count: "1" });
      expect(a.gift).toMatchObject({ name: "nf-join-settle", duration: "0.52s", delay: "0.06s", count: "1" });
      expect(a.words.map((w) => w.name)).toEqual(Array(a.words.length).fill("nf-join-child"));
      /* Title, lede, doors: 140ms, then 60ms apart. */
      expect(a.words.map((w) => parseFloat(w.delay))).toEqual([0.14, 0.2, 0.26]);
      /* The links work from the first frame. */
      expect(await island(page).getByRole("link").first().evaluate((el) => getComputedStyle(el).pointerEvents)).not.toBe("none");
      await page.waitForTimeout(1100);
      expect(await island(page).evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("fades for 160ms with no travel and no stagger under reduced motion and under Calm, and passes axe", async () => {
    for (const mode of [{ reducedMotion: true }, { motion: "calm" as const }]) {
      const { page, close } = await mountInBrowser({ entry: await door(CODE, { found: true, firstName: "Inviter" }), css: CSS, ...mode });
      try {
        const a = await arrival(page);
        expect(a.island).toEqual({ name: "nf-join-fade", duration: "0.16s", delay: "0s", count: "1" });
        expect(a.gift.name).toBe("none");
        expect(a.words.every((w) => w.name === "none")).toBe(true);
        await page.waitForTimeout(400);
        expect(await axeViolations(page)).toEqual([]);
      } finally {
        await close();
      }
    }
  });

  it("shows the door as it is when Off is chosen", async () => {
    const { page, close } = await mountInBrowser({ entry: await door(CODE, { found: true, firstName: "Inviter" }), css: CSS, motion: "off" });
    try {
      const a = await arrival(page);
      expect(a.island.name).toBe("none");
      expect(a.gift.name).toBe("none");
      expect(a.words.every((w) => w.name === "none")).toBe(true);
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    } finally {
      await close();
    }
  });
});
