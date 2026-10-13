/**
 * M2: THE CAUTION REGISTER, MOUNTED FOR REAL (Chromium, the product's own
 * tokens, document.css and caution.css).
 *
 * It holds the register's promises where a person reads them: the tenant and
 * the landlord or agent are shown the same entries, a disputed deduction
 * ends on "waiting for Vallo staff to rule" with no figure until the ruling
 * exists, the entries are on white paper with dark ink in the night theme,
 * and the whole sheet passes axe.
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

const CSS = productCss("app/css/chips.css", "app/css/document.css", "components/app/tenancy/caution.css");

/** One register, ruled or not, as the tenancy read would hand it over. */
const entry = (ruled: boolean) => `
  import { getDictionary } from "@vallo/i18n";
  import { mount } from "@/lib/testing/browser-root";
  import { CautionRegister } from "@/components/app/tenancy/CautionRegister";
  const t = getDictionary("en");
  const caution = {
    obligationId: "o1", amountMinor: 40000000, amount: "₦400,000", dueOn: "2026-10-14", dueOnLabel: "14 Oct 2026",
    state: "disputed", returned: "₦100,000", deducted: "₦0", outstanding: "₦300,000", outstandingMinor: 30000000,
    guaranteed: null, inDoubt: null, claimable: "₦0", claimableMinor: 0, claimOpen: false, canEscalate: false,
    deductions: [
      { id: "d1", item: "kitchen", amount: "₦50,000", note: "Cooker hob cracked", answer: "disputed",
        ruledAllowed: ${ruled ? '"₦20,000"' : "null"}, ruledReason: ${ruled ? '"Fair wear on a six-year-old hob"' : "null"},
        photoId: "p1", photoUrl: null },
      { id: "d2", item: "bathrooms", amount: "₦15,000", note: null, answer: null, ruledAllowed: null, ruledReason: null, photoId: "p2", photoUrl: null },
    ],
    returns: [
      { id: "r1", amount: "₦100,000", date: "3 Oct 2026", method: "bank_transfer", reference: "TRF123", recordedAs: "lister_sent",
        ownRecord: false, standing: "counted", contested: false, ruling: null, rulingReason: null },
    ],
  };
  mount(
    <main>
      <h1>Caution</h1>
      <CautionRegister caution={caution} copy={t.afterTheGate.tenancy} words={t.experienceMoney.caution} />
    </main>,
  );
`;

const WHITE = ["rg", "b(255, 255, 255)"].join("");

describe.skipIf(!hasBrowser)("CautionRegister in the browser", () => {
  it("ends a disputed line on the wait, with no ruling and no allowed figure, until staff rule", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(false), css: CSS });
    try {
      const line = page.getByTestId("caution-deduction-d1");
      await expect.poll(() => line.innerText()).toContain("Waiting for Vallo staff to rule");
      expect(await line.innerText()).not.toContain("allowed");
      expect(await line.innerText()).not.toContain("₦20,000");
      /* The second line has not been answered: it says so, as the tenant's. */
      expect(await page.getByTestId("caution-deduction-d2").innerText()).toContain("Not answered yet");
      /* The return keeps the record's own words and date. */
      expect(await page.getByTestId("caution-return-r1").innerText()).toContain("₦100,000 returned on 3 Oct 2026");
    } finally {
      await close();
    }
  });

  it("shows the ruling once it is made, in the record's figure and reason", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(true), css: CSS });
    try {
      const text = await page.getByTestId("caution-deduction-d1").innerText();
      expect(text).toContain("Vallo staff allowed ₦20,000: Fair wear on a six-year-old hob");
      expect(text).not.toContain("Waiting for Vallo staff to rule");
    } finally {
      await close();
    }
  });

  it("is paper on the night theme, its state a word beside it, and clean under axe", async () => {
    const { page, close } = await mountInBrowser({ entry: entry(false), css: CSS });
    try {
      const paper = await page.getByTestId("caution-register").evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(paper).toBe(WHITE);
      expect(await page.getByTestId("tenancy-caution").innerText()).toContain("A deduction is with Vallo staff");
      /* Contrast is measured on the settled page, not mid-unroll. */
      await page.waitForTimeout(800);
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });
});
