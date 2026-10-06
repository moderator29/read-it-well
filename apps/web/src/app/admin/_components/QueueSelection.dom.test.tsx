/**
 * The unified queue's multi-select and its batch tray, mounted for real in
 * Chromium on the product's own stylesheets. The boxes and selects belong to the
 * server-drawn `#queue-bulk` form, so the harness stands that form up the way the
 * page draws it (same ids, same field names, boxes tied to it by the `form`
 * attribute) and records what it would have submitted. What is held here:
 *
 *   - the tray appears when a row is ticked and goes away when none is, with the
 *     count announced politely;
 *   - a verb that needs a reason, or an operator, stays DISABLED until the form's
 *     own select has one, and enables the moment it does;
 *   - a verb that runs is a submit of the real form with the verb filled in, and a
 *     consequential one asks first, in a sheet, and submits nothing until
 *     confirmed;
 *   - MONEY IS NEVER PRESENT: nothing the tray or its sheet draws is a money
 *     verb, and the page hands it none (read from the page's own source).
 *
 * Fixtures: the page's own verbs and the real English words. The operator and
 * the row values are slots; nothing is a name, an amount or a reference.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const CSS = productCss(GLASS_CSS, "app/css/typography.css", "app/css/controls.css", "app/admin/_components/admin-material.css");

/* The page's own verbs, in its own order (../queue/page.tsx). */
const ENTRY = `
  import { getDictionary } from "@vallo/i18n";
  import { QueueSelection } from "@/app/admin/_components/QueueSelection";
  import { mount } from "@/lib/testing/browser-root";
  const t = getDictionary("en");
  const desk = t.platform.queueDesk;
  window.__submits = [];
  function Harness() {
    return (
      <div style={{ minHeight: 700, padding: 16 }}>
        <form
          id="queue-bulk"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            window.__submits.push({
              verb: data.get("verb"),
              reason: data.get("reason"),
              to: data.get("to"),
              items: data.getAll("item"),
            });
          }}
        >
          <select name="verb" aria-label="verb" defaultValue="take">
            {Object.keys(desk.verbs).map((verb) => <option key={verb} value={verb}>{desk.verbs[verb]}</option>)}
          </select>
          <select name="reason" aria-label="reason" defaultValue="">
            <option value="">{desk.bulkNoReason}</option>
            <option value="photos">{desk.sendBackLabels.photos}</option>
          </select>
          <select name="to" aria-label="operator" defaultValue="">
            <option value="">{desk.bulkNoOperator}</option>
            <option value="operator-slot">Operator slot</option>
          </select>
        </form>
        <ul>
          {["row-slot-1", "row-slot-2", "row-slot-3"].map((id, i) => (
            <li key={id}><label><input type="checkbox" name="item" form="queue-bulk" value={id} /> Row {i + 1}</label></li>
          ))}
        </ul>
        <QueueSelection
          verbs={[
            { id: "take", label: desk.verbs.take, icon: "user-check" },
            { id: "approve", label: desk.verbs.approve, icon: "verified", confirm: true },
            { id: "send_back", label: desk.verbs.send_back, icon: "arrow-left", needs: "reason", confirm: true },
            { id: "assign", label: desk.verbs.assign, icon: "user", needs: "to" },
            { id: "close_spam", label: desk.verbs.close_spam, icon: "block", confirm: true },
          ]}
          words={{
            label: t.experienceAdmin.cases.bulkLabel,
            count: t.experienceAdmin.cases.selected,
            clear: t.experienceUi.clearSelection,
            selectAll: t.experienceAdmin.cases.selectAll,
            selectNone: t.experienceAdmin.cases.selectNone,
            confirmTitle: t.experienceAdmin.cases.bulkConfirmTitle,
            confirmBody: t.experienceAdmin.cases.bulkConfirmBody,
            confirmApply: t.experienceAdmin.cases.bulkConfirmApply,
            notNow: t.experienceUi.notNow,
            needsReason: t.experienceAdmin.cases.bulkNeedsReason,
            needsTo: t.experienceAdmin.cases.bulkNeedsTo,
            needsOpen: t.experienceAdmin.cases.bulkNeedsOpen,
          }}
        />
      </div>
    );
  }
  mount(<Harness />);
`;

const tray = (page: Page) => page.getByRole("toolbar", { name: "Bulk actions on the selected rows" });
const verb = (page: Page, name: string) => tray(page).getByRole("button", { name, exact: true });
const rowBox = (page: Page, n: number) => page.getByRole("checkbox", { name: `Row ${n}` });
const submits = (page: Page) =>
  page.evaluate(() => (window as unknown as { __submits: Record<string, unknown>[] }).__submits);
const trayOpen = (page: Page) => page.locator(".nf-batch").getAttribute("data-open");

/* The form's own select, changed the way a person does. */
const choose = (page: Page, label: string, value: string) => page.getByLabel(label, { exact: true }).selectOption(value);

describe("what the queue page hands the tray (source)", () => {
  it("is five verbs, none of them money, and the tray is told nothing about amounts", () => {
    const page = readFileSync(join(__dirname, "..", "queue", "page.tsx"), "utf8");
    const block = page.slice(page.indexOf("<QueueSelection"), page.indexOf("/>", page.indexOf("words={{")));
    const ids = [...block.matchAll(/id:\s*"([a-z_]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["take", "approve", "send_back", "assign", "close_spam"]);
    expect(ids.join(" ")).not.toMatch(/pay|refund|release|settle|payout|money|amount|fee|ledger|reserve/);
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the queue's batch tray", () => {
  it("offers Select all once there are rows, and no tray until one is ticked", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await page.getByRole("button", { name: "Select every row on this page" }).waitFor();
      expect(await trayOpen(page)).toBeNull();
      expect(await page.locator(".nf-batch").evaluate((el) => (el as HTMLElement).inert)).toBe(true);
      expect(await page.locator(".nf-batch").evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
      expect(await verb(page, "Take").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("rises on the first tick with the count announced politely, follows the count, and goes on the last untick", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 1).check();
      await page.waitForFunction(() => document.querySelector(".nf-batch")?.getAttribute("data-open") !== null);
      const status = page.locator(".nf-batch__count");
      expect(await status.getAttribute("aria-live")).toBe("polite");
      expect(await status.textContent()).toBe("1 selected");
      await rowBox(page, 2).check();
      expect(await status.textContent()).toBe("2 selected");
      await rowBox(page, 1).uncheck();
      expect(await status.textContent()).toBe("1 selected");
      await rowBox(page, 2).uncheck();
      await page.waitForFunction(() => document.querySelector(".nf-batch")?.getAttribute("data-open") === null);
      expect(await page.locator(".nf-batch").evaluate((el) => (el as HTMLElement).inert)).toBe(true);
    } finally {
      await close();
    }
  });

  it("draws exactly the page's five verbs once open, and passes axe", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 1).check();
      await page.waitForTimeout(700);
      expect(await tray(page).locator(".nf-batch__actions button").allTextContents()).toEqual([
        "Take",
        "Approve",
        "Send back",
        "Hand to",
        "Close as not a person",
      ]);
      for (const h of await tray(page).getByRole("button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) {
        expect(h).toBeGreaterThanOrEqual(44);
      }
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("keeps Send back and Hand to disabled until the form's own reason or operator is chosen, and re-disables them when it is cleared", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 1).check();
      await page.waitForTimeout(500);
      expect(await verb(page, "Take").isDisabled()).toBe(false);
      expect(await verb(page, "Approve").isDisabled()).toBe(false);
      expect(await verb(page, "Close as not a person").isDisabled()).toBe(false);
      expect(await verb(page, "Send back").isDisabled()).toBe(true);
      expect(await verb(page, "Hand to").isDisabled()).toBe(true);
      /* A reason frees Send back only; an operator frees Hand to only. */
      await choose(page, "reason", "photos");
      expect(await verb(page, "Send back").isDisabled()).toBe(false);
      expect(await verb(page, "Hand to").isDisabled()).toBe(true);
      await choose(page, "operator", "operator-slot");
      expect(await verb(page, "Hand to").isDisabled()).toBe(false);
      await choose(page, "reason", "");
      expect(await verb(page, "Send back").isDisabled()).toBe(true);
      await choose(page, "operator", "");
      expect(await verb(page, "Hand to").isDisabled()).toBe(true);
      /* A disabled verb does nothing when pressed. */
      await verb(page, "Send back").click({ force: true }).catch(() => undefined);
      expect(await page.getByRole("dialog").count()).toBe(0);
      expect(await submits(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("runs a plain verb at once: the real form is submitted with that verb and the ticked rows, and only those", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 1).check();
      await rowBox(page, 3).check();
      await page.waitForTimeout(500);
      await verb(page, "Take").click();
      expect(await submits(page)).toEqual([{ verb: "take", reason: "", to: "", items: ["row-slot-1", "row-slot-3"] }]);
      await choose(page, "operator", "operator-slot");
      await verb(page, "Hand to").click();
      expect(await submits(page)).toHaveLength(2);
      expect((await submits(page))[1]).toEqual({ verb: "assign", reason: "", to: "operator-slot", items: ["row-slot-1", "row-slot-3"] });
    } finally {
      await close();
    }
  });

  it("asks first before Approve too, and runs it only on Apply", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 1).check();
      await page.waitForTimeout(500);
      await verb(page, "Approve").click();
      const sheet = page.getByRole("dialog", { name: "Apply to the selected rows?" });
      await sheet.waitFor();
      expect(await submits(page)).toEqual([]);
      await sheet.getByRole("button", { name: "Apply", exact: true }).click();
      expect(await submits(page)).toEqual([{ verb: "approve", reason: "", to: "", items: ["row-slot-1"] }]);
    } finally {
      await close();
    }
  });

  it("says what a verb is waiting for, instead of a silent disabled button, and the line goes when it is chosen", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 1).check();
      await page.waitForTimeout(500);
      const hints = page.getByTestId("bulk-needs");
      expect(await hints.allTextContents()).toEqual([
        expect.stringContaining("Send back needs a reason, chosen in the bulk form."),
        expect.stringContaining("Hand to needs a person to hand to, chosen in the bulk form."),
      ]);
      await choose(page, "reason", "photos");
      expect(await hints.count()).toBe(1);
      await choose(page, "operator", "operator-slot");
      expect(await hints.count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("asks first for a consequential verb, in a sheet, and submits nothing until Apply", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 1).check();
      await rowBox(page, 2).check();
      await choose(page, "reason", "photos");
      await page.waitForTimeout(500);
      await verb(page, "Send back").click();
      const sheet = page.getByRole("dialog", { name: "Apply to the selected rows?" });
      await sheet.waitFor();
      expect(await submits(page)).toEqual([]);
      expect(await sheet.textContent()).toContain(
        "Send back will be applied to 2 selected rows. One batch is written to the audit log, and rows another operator holds are skipped.",
      );
      await page.waitForTimeout(500);
      expect(await axeViolations(page)).toEqual([]);
      await sheet.getByRole("button", { name: "Apply", exact: true }).click();
      expect(await submits(page)).toEqual([{ verb: "send_back", reason: "photos", to: "", items: ["row-slot-1", "row-slot-2"] }]);
      await page.getByRole("dialog").waitFor({ state: "detached" });
    } finally {
      await close();
    }
  });

  it("closes the sheet on Not now and on Escape without submitting, for both consequential verbs", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 1).check();
      await page.waitForTimeout(500);
      await verb(page, "Close as not a person").click();
      await page.getByRole("dialog").waitFor();
      await page.getByRole("button", { name: "Not now", exact: true }).click();
      await page.getByRole("dialog").waitFor({ state: "detached" });
      await verb(page, "Close as not a person").click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "detached" });
      expect(await submits(page)).toEqual([]);
      /* The selection is untouched by backing out. */
      expect(await rowBox(page, 1).isChecked()).toBe(true);
    } finally {
      await close();
    }
  });

  it("selects and clears every row from Select all, and clears from the tray, which then goes away", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await page.getByRole("button", { name: "Select every row on this page" }).click();
      expect(await page.locator(".nf-batch__count").textContent()).toBe("3 selected");
      expect(await rowBox(page, 2).isChecked()).toBe(true);
      /* The same button now offers the way back. */
      await page.getByRole("button", { name: "Clear every row" }).click();
      expect(await rowBox(page, 1).isChecked()).toBe(false);
      await page.waitForFunction(() => document.querySelector(".nf-batch")?.getAttribute("data-open") === null);

      await rowBox(page, 2).check();
      await page.waitForTimeout(500);
      await tray(page).getByRole("button", { name: "Clear selection" }).click();
      expect(await rowBox(page, 2).isChecked()).toBe(false);
      await page.waitForFunction(() => document.querySelector(".nf-batch")?.getAttribute("data-open") === null);
    } finally {
      await close();
    }
  });

  it("is operable by keyboard alone: tick with Space, reach a verb with Tab, run it with Enter", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 2).focus();
      await page.keyboard.press("Space");
      await page.waitForTimeout(500);
      await verb(page, "Take").focus();
      await page.keyboard.press("Enter");
      expect(await submits(page)).toEqual([{ verb: "take", reason: "", to: "", items: ["row-slot-2"] }]);
      /* Escape inside the tray clears the selection. */
      await verb(page, "Approve").focus();
      await page.keyboard.press("Escape");
      expect(await rowBox(page, 2).isChecked()).toBe(false);
    } finally {
      await close();
    }
  });

  it("never draws money: no money verb, no amount, no currency, no payout control, in the tray or the sheet", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS });
    try {
      await rowBox(page, 1).check();
      await choose(page, "reason", "photos");
      await page.waitForTimeout(500);
      await verb(page, "Send back").click();
      await page.getByRole("dialog").waitFor();
      const drawn = (
        (await page.locator(".nf-batch").innerText()) +
        " " +
        (await page.getByRole("dialog").innerText()) +
        " " +
        (await page.locator(".nf-admin-selectall").innerText())
      ).toLowerCase();
      expect(drawn).not.toMatch(/₦|naira|\bngn\b|refund|payout|release|settle|reserve|ledger|\bpay(ment)?s?\b|\bfee\b|\bmoney\b/);
      /* The only figure is the count of rows. */
      expect(drawn.replace(/\b1 selected\b/g, "").replace(/\b1 selected rows\b/g, "")).not.toMatch(/\d{2,}/);
      /* Nor is there a drag-to-confirm (the control a payout uses) anywhere near it. */
      expect(await page.locator("[data-state][data-testid=dtc], .nf-dtc, [class*='drag-to-confirm']").count()).toBe(0);
    } finally {
      await close();
    }
  });

  it("rises without travel for a reader who asked for less motion", async () => {
    const { page, close } = await mountInBrowser({ entry: ENTRY, css: CSS, reducedMotion: true });
    try {
      await rowBox(page, 1).check();
      await page.waitForFunction(() => getComputedStyle(document.querySelector(".nf-batch")!).visibility === "visible");
      expect(await verb(page, "Take").isVisible()).toBe(true);
      expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)).toBe(0);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });
});
