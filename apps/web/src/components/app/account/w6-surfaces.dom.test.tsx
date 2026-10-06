/**
 * The referral hub's gift, the passport credential, the figures and the
 * verification path, mounted for real in Chromium on the product's own CSS:
 * what each draws, what a tap does, and what a reader who asked for less motion
 * is shown. With `W6_SHOTS=<dir>` it also writes the screenshots the report
 * cites (390 and 1440, both themes); without it, it asserts only.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  BROWSER_TEST_TIMEOUT,
  closeBrowser,
  hasBrowser,
  mountInBrowser,
  warmBrowser,
} from "@/lib/testing/mount-in-browser";
import { axeViolations } from "@/components/ui/ported-test-css";
import { W6_CSS } from "./w6-test-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const SHOTS = process.env.W6_SHOTS ?? "";
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const CLIPBOARD = `window.__copied = []; Object.defineProperty(navigator, "clipboard", { value: { writeText: async (t) => { window.__copied.push(t); } }, configurable: true });`;

const ticketEntry = (autoplay: boolean) => `
  import { getDictionary } from "@vallo/i18n";
  import { InviteTicket } from "@/components/app/account/InviteTicket";
  import { mount } from "@/lib/testing/browser-root";
  const t = getDictionary("en");
  mount(
    <div style={{ maxWidth: 672, margin: "0 auto", padding: 16 }}>
      <InviteTicket
        copy={t.experienceAccount.invite}
        code="K7M2QX"
        url="https://vallo.test/join/K7M2QX"
        shareText="Join with my link: https://vallo.test/join/K7M2QX"
        whatsappLabel={t.publicDoors.invite.whatsapp}
        dismissLabel={t.experienceUi.notNow}
        autoplay={${autoplay}}
      />
    </div>,
  );
`;

describe.skipIf(!hasBrowser && !process.env.CI)("the referral hub's gift", () => {
  it("opens settled for a returning member: the real code, whole, and no reveal playing", async () => {
    const { page, close } = await mountInBrowser({ entry: ticketEntry(false), css: W6_CSS, init: CLIPBOARD });
    try {
      const gift = page.getByTestId("invite-gift");
      expect(await gift.getAttribute("data-reveal")).toBe("settled");
      expect(await page.getByTestId("invite-code").getAttribute("aria-label")).toBe("K7M2QX");
      expect(await page.locator(".nf-ticket__code > span").allTextContents()).toEqual(["K", "7", "M", "2", "Q", "X"]);
      /* The ticket is already there: nothing is waiting to be revealed. */
      expect(await page.locator(".nf-ticket").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("copies the code, says so on the button, and puts exactly the code on the clipboard", async () => {
    const { page, close } = await mountInBrowser({ entry: ticketEntry(false), css: W6_CSS, init: CLIPBOARD });
    try {
      await page.getByTestId("invite-copy").click();
      await page.waitForFunction(() => (window as unknown as { __copied: string[] }).__copied.length > 0);
      expect(await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)).toEqual(["K7M2QX"]);
      await page.getByText("Copied", { exact: true }).waitFor();
    } finally {
      await close();
    }
  });

  it("shares through the illustrated action sheet: the link, WhatsApp and more, and a quiet dismiss", async () => {
    const { page, close } = await mountInBrowser({ entry: ticketEntry(false), css: W6_CSS, init: CLIPBOARD });
    try {
      await page.getByTestId("invite-share").click();
      const dialog = page.getByRole("dialog", { name: "Share your invite" });
      await dialog.waitFor();
      expect(await dialog.getAttribute("class")).toContain("nf-asi");
      expect(await dialog.locator(".nf-asi__row").allTextContents()).toEqual([
        expect.stringContaining("Copy the link"),
        expect.stringContaining("Share on WhatsApp"),
        expect.stringContaining("More ways to share"),
      ]);
      await dialog.getByText("Copy the link").click();
      await page.waitForFunction(() => (window as unknown as { __copied: string[] }).__copied.length > 0);
      expect(await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)).toEqual([
        "https://vallo.test/join/K7M2QX",
      ]);
    } finally {
      await close();
    }
  });

  it("plays the reveal on a first visit, with the dashed edge drawn by the mask and the six characters landing in order", async () => {
    const { page, close } = await mountInBrowser({ entry: ticketEntry(true), css: W6_CSS, init: CLIPBOARD });
    try {
      expect(await page.getByTestId("invite-gift").getAttribute("data-reveal")).toBe("play");
      const names = await page.evaluate(() => ({
        draw: getComputedStyle(document.querySelector(".nf-ticket__draw")!).animationName,
        pop: getComputedStyle(document.querySelector(".nf-gift__pop")!).animationName,
        last: getComputedStyle(document.querySelector(".nf-ticket__code > span:last-child")!).animationDelay,
        first: getComputedStyle(document.querySelector(".nf-ticket__code > span:first-child")!).animationDelay,
      }));
      expect(names.draw).toBe("nf-ticket-draw");
      expect(names.pop).toBe("nf-gift-pop");
      /* 45ms apart: the last of six lands 225ms after the first. */
      expect(parseFloat(names.last) - parseFloat(names.first)).toBeCloseTo(0.225, 2);
    } finally {
      await close();
    }
  });

  it("shows a reader who asked for less motion the final frame at once", async () => {
    const { page, close } = await mountInBrowser({ entry: ticketEntry(true), css: W6_CSS, reducedMotion: true, init: CLIPBOARD });
    try {
      await page.waitForTimeout(80);
      expect(await page.locator(".nf-ticket").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      expect(await page.locator(".nf-ticket__code > span").first().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
      expect(await page.locator(".nf-gift__sealed").evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    } finally {
      await close();
    }
  });

  it("plays again when the gift is tapped", async () => {
    const { page, close } = await mountInBrowser({ entry: ticketEntry(false), css: W6_CSS, init: CLIPBOARD });
    try {
      await page.getByTestId("invite-replay").click();
      expect(await page.getByTestId("invite-gift").getAttribute("data-reveal")).toBe("play");
    } finally {
      await close();
    }
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the verification path and the figures", () => {
  it("draws four rungs that each name what is checked, with a date only on a decided one", async () => {
    const { page, close } = await mountInBrowser({
      css: W6_CSS,
      entry: `
        import { getDictionary } from "@vallo/i18n";
        import { VerificationPath } from "@/components/verification/VerificationPath";
        import { buildPath } from "@/components/verification/verification-path";
        import { mount } from "@/lib/testing/browser-root";
        const t = getDictionary("en");
        const rungs = buildPath({
          ladder: { rungs: { identity: { status: "passed", note: null, decidedAt: "2026-03-01T09:00:00Z" } } },
          documents: null,
        });
        mount(<div style={{ maxWidth: 672, margin: "0 auto", padding: 16 }}><VerificationPath rungs={rungs} copy={t.experienceAccount.verification} locale="en" /></div>);
      `,
    });
    try {
      expect(await page.locator(".nf-vpath__rung").evaluateAll((els) => els.map((el) => el.getAttribute("data-state")))).toEqual([
        "passed",
        "current",
        "upcoming",
        "upcoming",
      ]);
      expect(await page.locator(".nf-vpath__when").allTextContents()).toEqual(["Passed on 1 Mar 2026"]);
      expect(await page.locator(".nf-vpath__evidence").count()).toBe(4);
      expect(await page.locator(".nf-vpath-head__count").textContent()).toBe("1 of 4 steps passed");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("draws no figure at all without real numbers, and never an invented zero", async () => {
    const { page, close } = await mountInBrowser({
      css: W6_CSS,
      entry: `
        import { getDictionary } from "@vallo/i18n";
        import { ReferralFigures } from "@/components/app/account/ReferralFigures";
        import { mount } from "@/lib/testing/browser-root";
        const t = getDictionary("en");
        mount(<div id="host"><ReferralFigures copy={t.experienceAccount.invite} locale="en" earnedMinor={null} progress={null} /></div>);
      `,
    });
    try {
      expect(await page.locator("#host").innerHTML()).toBe("");
    } finally {
      await close();
    }
  });

  it("draws the earned figure and the progress when Vallo has them", async () => {
    const { page, close } = await mountInBrowser({
      css: W6_CSS,
      entry: `
        import { getDictionary } from "@vallo/i18n";
        import { ReferralFigures } from "@/components/app/account/ReferralFigures";
        import { mount } from "@/lib/testing/browser-root";
        const t = getDictionary("en");
        mount(<ReferralFigures copy={t.experienceAccount.invite} locale="en" earnedMinor={150000} progress={{ done: 2, total: 3 }} />);
      `,
    });
    try {
      await page.getByTestId("referral-figures").waitFor();
      expect(await page.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("2 of 3");
      expect(await page.getByTestId("referral-figures").textContent()).toContain("1,500");
    } finally {
      await close();
    }
  });
});

describe.skipIf(!SHOTS || (!hasBrowser && !process.env.CI))("screenshots for the report", () => {
  for (const theme of ["dark", "light"] as const) {
    for (const [name, width] of [["390", 390], ["1440", 1440]] as const) {
      it(`the gift, settled and playing, ${theme} at ${name}`, async () => {
        const { page, close } = await mountInBrowser({
          entry: ticketEntry(false),
          css: W6_CSS,
          init: CLIPBOARD,
          viewport: { width, height: 900 },
        });
        try {
          await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
          await page.waitForTimeout(400);
          await page.screenshot({ path: join(SHOTS, `invite-settled-${theme}-${name}.png`) });
          await page.getByTestId("invite-replay").click();
          for (const ms of [700, 1100, 1900]) {
            await page.waitForTimeout(ms === 700 ? 700 : ms === 1100 ? 400 : 800);
            await page.screenshot({ path: join(SHOTS, `invite-play-${ms}-${theme}-${name}.png`) });
          }
        } finally {
          await close();
        }
      });
    }
  }
});
