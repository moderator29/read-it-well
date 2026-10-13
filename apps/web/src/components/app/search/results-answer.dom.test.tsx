/**
 * THE SEARCH ANSWERING, IN CHROMIUM (round 5 craft, "a search finds the right
 * place"): when a filter changes the shelf, the cards that stayed glide and
 * never re-enter, the new ones arrive on a short stagger at the browsing pace,
 * and the count rolls only the digits that changed. Read from the computed
 * animations the product stylesheets produce, not from a clock.
 *
 * The cards are stand-ins with the listing card's own classes and custom
 * property (`nf-pcard nf-card-in`, `--card-i`), so the test reads the shared
 * card rules and the search's own (`results-motion.css`) together without
 * mounting the card, which belongs to another surface.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright-core";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT * 2 });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(
  "app/css/animation.css",
  "app/css/list-views.css",
  "app/css/motion-kit.css",
  "components/app/search/results-motion.css",
);

/* Before: four places. After a filter: "two" moved (index 1 to 2), "four"
   held its cell, "one" and "three" left, and seven are new. */
const ENTRY = `
  import { useState } from "react";
  import { mount } from "@/lib/testing/browser-root";
  import { getDictionary } from "@vallo/i18n";
  import { ResultsFade } from "@/components/app/search/ResultsFade";
  import { ShelfCount } from "@/components/app/search/ShelfCount";
  import { parseShelfQuery } from "@/components/app/search/shelf-query";
  const t = getDictionary("en");
  const SETS = {
    a: ["one", "two", "three", "four"],
    b: ["five", "six", "two", "four", "seven", "eight", "nine", "ten", "eleven"],
  };
  function Harness() {
    const [step, setStep] = useState("a");
    window.__next = () => { history.pushState(null, "", "/search?beds=2"); setStep("b"); };
    return (
      <>
        <ShelfCount query={parseShelfQuery({})} count={step === "a" ? 342 : 348} narrowed locale="en" t={t} />
        <ResultsFade>
          <ul key={step} style={{ display: "grid", gridTemplateColumns: "repeat(2, 160px)", gap: 8, listStyle: "none", padding: 0 }}>
            {SETS[step].map((id, i) => (
              <li key={id} data-id={id}>
                <article className="nf-pcard nf-card-in" style={{ "--card-i": Math.min(i, 5) }}>
                  <a href={"/listing/" + id} style={{ display: "block", height: 96 }}>{id}</a>
                </article>
              </li>
            ))}
          </ul>
        </ResultsFade>
        <a id="go" href="/search?beds=2">Two beds</a>
      </>
    );
  }
  /* The link is a same-page search change: ResultsFade hears the click on the
     document first; the window then stands in for the router. */
  window.addEventListener("click", (event) => {
    if (event.target.closest && event.target.closest("#go")) { event.preventDefault(); window.__next(); }
  });
  mount(<Harness />);
`;

type Seen = {
  card: { name: string; duration: number; delay: number; props: string[] }[];
  row: { duration: number; easing: string; props: string[] }[];
  stayed: boolean;
  arrived: boolean;
};

const read = (page: Page) =>
  page.evaluate(() => {
    const out: Record<string, Seen> = {};
    for (const li of document.querySelectorAll<HTMLElement>("li[data-id]")) {
      const card = li.querySelector("article")!;
      const keys = (a: Animation) =>
        (a.effect as KeyframeEffect)
          .getKeyframes()
          .flatMap((k) => Object.keys(k))
          .filter((k) => !["offset", "easing", "composite", "computedOffset"].includes(k))
          .filter((k, i, all) => all.indexOf(k) === i)
          .sort();
      out[li.dataset.id!] = {
        /* Entrances only: a hover transition under the test's pointer is not one. */
        card: card.getAnimations().filter((a) => a instanceof CSSAnimation).map((a) => ({
          name: (a as CSSAnimation).animationName ?? "",
          duration: Number(a.effect!.getTiming().duration),
          delay: Number(a.effect!.getTiming().delay),
          props: keys(a),
        })),
        row: li.getAnimations().map((a) => ({
          duration: Number(a.effect!.getTiming().duration),
          easing: String(a.effect!.getTiming().easing),
          props: keys(a),
        })),
        stayed: "stayed" in li.dataset,
        arrived: "arrived" in li.dataset,
      };
    }
    return out;
  });

const wheels = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".nf-shelf-count .nf-odo__wheel, [data-testid=results-count] .nf-odo__wheel")].map((w) =>
      w.getAnimations().map((a) => Number(a.effect!.getTiming().duration)),
    ),
  );

async function filter(page: Page) {
  await page.waitForTimeout(700);
  await page.click("#go");
  await page.waitForTimeout(30);
}

describe.skipIf(!hasBrowser && !process.env.CI)("the search answering", () => {
  it("first screenful arrives at the browsing pace, first six staggered 40ms", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, url: "http://vallo.test/search" });
    try {
      const first = await read(page);
      expect(first.one!.card).toHaveLength(1);
      expect(first.one!.card[0]!.name).toBe("nf-list-in");
      expect(first.one!.card[0]!.duration).toBe(240);
      expect(first.four!.card[0]!.delay).toBe(120);
      expect(first.one!.card[0]!.props).toEqual(["opacity", "transform"]);
    } finally {
      await close();
    }
  });

  it("a filter: survivors glide and never re-enter, newcomers stagger, the count rolls one wheel", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, url: "http://vallo.test/search" });
    try {
      expect(await page.locator("[data-testid=results-count]").innerText()).toContain("342");
      expect(await wheels(page), "the count never rolls on first paint").toEqual([]);
      await filter(page);
      const after = await read(page);
      /* The card that moved: no entrance replay, one translate glide at 240ms on land. */
      expect(after.two!.stayed).toBe(true);
      expect(after.two!.card).toEqual([]);
      expect(after.two!.row).toHaveLength(1);
      expect(after.two!.row[0]!.duration).toBe(240);
      expect(after.two!.row[0]!.easing).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
      expect(after.two!.row[0]!.props).toEqual(["translate"]);
      /* The card that held its cell: nothing at all. */
      expect(after.four!.stayed).toBe(true);
      expect(after.four!.card).toEqual([]);
      expect(after.four!.row).toEqual([]);
      /* The newcomers: the stagger counts among the NEW cards, capped at the sixth. */
      const delays = ["five", "six", "seven", "eight", "nine", "ten", "eleven"].map((id) => {
        expect(after[id]!.arrived, id).toBe(true);
        expect(after[id]!.card[0]!.name, id).toBe("nf-list-in");
        expect(after[id]!.card[0]!.duration, id).toBe(240);
        return after[id]!.card[0]!.delay;
      });
      expect(delays).toEqual([0, 40, 80, 120, 160, 200, 200]);
      /* 342 to 348: one digit changed, one wheel turns, at 240ms. */
      expect(await wheels(page)).toEqual([[240]]);
      await page.waitForTimeout(400);
      expect(await page.locator("[data-testid=results-count]").innerText()).toContain("348");
    } finally {
      await close();
    }
  });

  it("reduced motion: nothing travels, survivors are simply there, newcomers fade 160ms, the count lands", async () => {
    const { page, close } = await mountInBrowser({
      entry: ENTRY,
      css: CSS,
      url: "http://vallo.test/search",
      reducedMotion: true,
    });
    try {
      await filter(page);
      const after = await read(page);
      expect(after.two!.card).toEqual([]);
      expect(after.two!.row).toEqual([]);
      for (const id of ["five", "six", "seven"]) {
        expect(after[id]!.card, id).toHaveLength(1);
        expect(after[id]!.card[0]!.name, id).toBe("nf-results-new");
        expect(after[id]!.card[0]!.duration, id).toBe(160);
        expect(after[id]!.card[0]!.delay, id).toBe(0);
        expect(after[id]!.card[0]!.props, id).toEqual(["opacity"]);
      }
      expect((await wheels(page)).flat()).toEqual([]);
      const shown = await page.evaluate(() => {
        const two = document.querySelector("li[data-id=two] article")!;
        return { opacity: getComputedStyle(two).opacity, transform: getComputedStyle(two).transform };
      });
      expect(shown).toEqual({ opacity: "1", transform: "none" });
      expect(await page.locator("[data-testid=results-count]").innerText()).toContain("348");
    } finally {
      await close();
    }
  });
});
