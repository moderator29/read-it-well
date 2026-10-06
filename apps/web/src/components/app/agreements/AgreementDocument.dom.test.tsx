/**
 * M2: THE AGREEMENT AS A DOCUMENT, MOUNTED FOR REAL (Chromium, the product's
 * tokens, document.css, status-track.css and agreements.css).
 *
 *   the version diff     the old value struck and said as "Was" for a
 *                        screen reader, the new beside it, on the paper
 *   every version        confirmations bound to the version they name
 *   the approval track   the payoff pop plays once the fill has reached the
 *                        approval node, waits while a dialog covers the
 *                        page, and never plays under reduced motion
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
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss("app/css/document.css", "app/css/status-track.css", "components/app/agreements/agreements.css");

const versionsEntry = `
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  import { DocumentSheet, DocHead } from "@/components/app/money/DocumentSheet";
  import { AgreementVersions } from "@/components/app/agreements/AgreementVersions";
  import { AgreementHistory } from "@/components/app/agreements/AgreementHistory";
  import { previousVersionDiff, versionRegister } from "@/components/app/agreements/version-register";
  const t = getDictionary("en");
  const versions = [
    { version: 1, terms: { rent_minor: 100000000, move_in: "2026-11-01" }, amountMinor: 120000000 },
    { version: 2, terms: { rent_minor: 110000000, move_in: "2026-11-01" }, amountMinor: 130000000 },
  ];
  const events = [
    { at: "2026-10-01T09:00:00Z", action: "opened", note: null, side: "renter", version: 1 },
    { at: "2026-10-01T10:00:00Z", action: "confirmed", note: null, side: "renter", version: 1 },
    { at: "2026-10-02T09:00:00Z", action: "amended", note: null, side: "owner", version: 2 },
    { at: "2026-10-02T12:00:00Z", action: "confirmed", note: null, side: "owner", version: 2 },
  ];
  const names = { renter: "Ada Obi", owner: "Bayo Ade" };
  mount(
    <main>
      <h1>Agreement</h1>
      <DocumentSheet aria-labelledby="t" data-testid="sheet">
        <DocHead label="Lekki flat" title="The terms (version 2)" id="t" />
        <AgreementVersions
          diff={previousVersionDiff({ current: 2, versions })}
          entries={versionRegister({ current: 2, stored: [1, 2], events, confirmedNow: { renter: false, owner: true } })}
          names={names}
          locale="en"
          copy={t.experienceMoney.agreements}
          diffCopy={t.memberKit.agreementDiff}
        />
      </DocumentSheet>
      <AgreementHistory events={events} names={names} locale="en" copy={t.experienceMoney.agreements} />
    </main>,
  );
`;

/** The track on its motion wrapper: approved, so the third node may pop. */
const trackEntry = (opts: { dialog?: boolean } = {}) => `
  import { mount } from "@/lib/testing/browser-root";
  import { StatusTrack } from "@/components/app/status/StatusTrack";
  import { AgreementTrackMotion } from "@/components/app/agreements/AgreementTrackMotion";
  const steps = [
    { key: "drawn", label: "Drawn up", when: "1 Oct", state: "done" },
    { key: "confirmed", label: "Both confirmed", when: "2 Oct", state: "done" },
    { key: "approved", label: "Vallo approved", when: "3 Oct", state: "done" },
    { key: "paid", label: "Paid", when: null, state: "upcoming" },
  ];
  mount(
    <main>
      ${opts.dialog ? '<div role="dialog" aria-modal="true" aria-label="Approved" id="sheet">Approved</div>' : ""}
      <AgreementTrackMotion popAt={3} seenKey="agreement-approved-track:test">
        <StatusTrack label="Agreement progress" steps={steps} testId="track" />
      </AgreementTrackMotion>
    </main>,
  );
`;

const popState = (page: import("playwright-core").Page) =>
  page.locator(".nf-agr-track").evaluate((el) => el.getAttribute("data-pop"));

describe.skipIf(!hasBrowser)("the agreement document in the browser", () => {
  it("prints what changed from the version before, struck and replaced, and says it in words", async () => {
    const { page, close } = await mountInBrowser({ entry: versionsEntry, css: CSS });
    try {
      const rent = page.getByTestId("agreement-diff-rent_minor");
      const said = await rent.textContent();
      expect(said).toMatch(/Was .*1,000,000.* Now .*1,100,000/);
      expect(await page.getByTestId("agreement-diff-total").textContent()).toMatch(/1,200,000.*1,300,000/);
      expect(await rent.locator("s").count()).toBe(1);
    } finally {
      await close();
    }
  });

  it("binds each confirmation to its version: version 1's renter confirmation is never version 2's", async () => {
    const { page, close } = await mountInBrowser({ entry: versionsEntry, css: CSS });
    try {
      const current = await page.getByTestId("agreement-version-2").innerText();
      expect(current).toContain("This version");
      expect(current).toContain("Changed by Bayo Ade");
      expect(current).not.toContain("Ada Obi confirmed");
      const first = await page.getByTestId("agreement-version-1").innerText();
      expect(first).toContain("Ada Obi confirmed it on");
      expect(first).toContain("Replaced by version 2");
      expect(await page.getByTestId("agreement-history").innerText()).toContain("Terms changed · Bayo Ade");
      /* Contrast is measured on the settled page, not mid-unroll. */
      await page.waitForTimeout(800);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("pops the approval node once the fill has reached it", async () => {
    const { page, close } = await mountInBrowser({ entry: trackEntry(), css: CSS });
    try {
      expect(await popState(page)).toBeNull();
      await expect.poll(() => popState(page), { timeout: 3000 }).toBe("play");
      const node = page.locator(".nf-track__step:nth-child(3) .nf-track__node");
      expect(await node.evaluate((el) => getComputedStyle(el).animationName)).toBe("nf-agr-pop");
    } finally {
      await close();
    }
  });

  it("waits while a dialog covers the page, then pops when it closes", async () => {
    const { page, close } = await mountInBrowser({ entry: trackEntry({ dialog: true }), css: CSS });
    try {
      await page.waitForTimeout(1000);
      expect(await popState(page)).toBeNull();
      await page.evaluate(() => document.getElementById("sheet")?.remove());
      await expect.poll(() => popState(page), { timeout: 3000 }).toBe("play");
    } finally {
      await close();
    }
  });

  it("never pops under reduced motion, and the track is simply drawn", async () => {
    const { page, close } = await mountInBrowser({ entry: trackEntry(), css: CSS, reducedMotion: true });
    try {
      await page.waitForTimeout(1000);
      expect(await popState(page)).toBeNull();
      const connector = await page
        .locator(".nf-track__step:nth-child(1)")
        .evaluate((el) => getComputedStyle(el, "::after").animationName);
      expect(connector).toBe("none");
    } finally {
      await close();
    }
  });
});
