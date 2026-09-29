/**
 * EVERY WIRED SUCCESS MOMENT, DRIVEN FOR REAL (docs/SUCCESS_MOMENTS.md).
 *
 * Each block mounts the real component in Chromium with its server action
 * staged (lib/testing/mount-in-browser), and asserts the success sheet opens
 * on the ok path and does NOT open on the pending or error paths. The staged
 * answers are the shapes the actions really return.
 *
 * A "does not open" assertion first waits for the component to have shown
 * what it did instead (the pending sheet, the refusal), so it is not passing
 * merely because it looked too early.
 */
import { afterAll, describe, expect, it } from "vitest";
import type { Page } from "playwright-core";
import { closeBrowser, hasBrowser, mountInBrowser } from "@/lib/testing/mount-in-browser";

afterAll(closeBrowser);

const SHEET = '[data-testid="success-sheet"]';

async function sheetOpens(page: Page, title?: string): Promise<void> {
  await page.waitForSelector(SHEET, { timeout: 8_000 });
  if (title) {
    await page.waitForFunction(
      (t) => document.querySelector('[data-testid="success-title"]')?.textContent === t,
      title,
      { timeout: 8_000 },
    );
  }
}

async function noSheet(page: Page): Promise<void> {
  /* One more frame for anything scheduled after the answer. */
  await page.waitForTimeout(300);
  expect(await page.locator(SHEET).count()).toBe(0);
}

async function actionCalled(page: Page, name: string): Promise<void> {
  await page.waitForFunction(
    (n) => ((window as unknown as { __calls?: unknown[][] }).__calls ?? []).some((c) => c[0] === n),
    name,
    { timeout: 8_000 },
  );
}

const routerCalls = (page: Page) =>
  page.evaluate(() => (window as unknown as { __router?: { calls: unknown[][] } }).__router?.calls ?? []);

const run = describe.skipIf(!hasBrowser && !process.env.CI);

/* --------------------------------------------------------------- money */

const PAYMENT_RETURN = `
  import { mount } from "@/lib/testing/browser-root";
  import { PaymentReturn } from "@/app/(app)/checkout/[bookingId]/PaymentReturn";
  mount(<PaymentReturn reference="rm-book-abc123" bookingId="bk-1" amountMinor={50000000} locale="en"
    retryHref="/checkout/bk-1" plansAction={{ label: "See your stays", href: "/bookings" }} />);
`;

run("card payment settled (checkout return)", () => {
  it("opens with the SETTLED amount and the reference when the charge settled against this booking", async () => {
    const { page, close } = await mountInBrowser({
      entry: PAYMENT_RETURN,
      url: "http://vallo.test/checkout/bk-1?paid=1&reference=rm-book-abc123",
      actions: {
        settleCardPayment: `async () => ({ ok: true, data: { bookingId: "bk-1", amountMinor: 48500000, confirmed: true, outcome: "settled" } })`,
      },
    });
    try {
      await sheetOpens(page, "Stay paid");
      expect(await page.getByTestId("success-amount").textContent()).toContain("485,000");
      expect(await page.locator(".nf-success__mono").textContent()).toBe("rm-book-abc123");
      /* The flag goes when the sheet does. */
      await page.getByTestId("success-secondary").click();
      const replaced = (await routerCalls(page)).filter((c) => c[0] === "replace");
      expect(replaced[0]?.[1]).toBe("/checkout/bk-1");
    } finally {
      await close();
    }
  });

  it("does not open while the payment is still being confirmed", async () => {
    const { page, close } = await mountInBrowser({
      entry: PAYMENT_RETURN,
      actions: { settleCardPayment: `() => new Promise(() => {})` },
    });
    try {
      await page.getByText("Confirming your payment").first().waitFor();
      await noSheet(page);
    } finally {
      await close();
    }
  });

  it("does not open for a settlement against another booking, or a refunded charge", async () => {
    for (const data of [
      `{ bookingId: "bk-OTHER", amountMinor: 1, confirmed: true, outcome: "settled" }`,
      `{ bookingId: "bk-1", amountMinor: 1, confirmed: false, outcome: "already-settled", transactionStatus: "REFUNDED" }`,
    ]) {
      const { page, close } = await mountInBrowser({
        entry: PAYMENT_RETURN,
        actions: { settleCardPayment: `async () => ({ ok: true, data: ${data} })` },
      });
      try {
        await page.getByText("Still checking").first().waitFor();
        await noSheet(page);
      } finally {
        await close();
      }
    }
  });

  it("does not open when the server refuses (still processing, failed)", async () => {
    const { page, close } = await mountInBrowser({
      entry: PAYMENT_RETURN,
      actions: { settleCardPayment: `async () => ({ ok: false, error: "The payment is still processing. Your booking confirms the moment it settles." })` },
    });
    try {
      await page.getByText("Payment not confirmed").first().waitFor();
      await noSheet(page);
    } finally {
      await close();
    }
  });
});

run("rent and move-in paid (rent return)", () => {
  it("says rent, not a stay", async () => {
    const { page, close } = await mountInBrowser({
      entry: PAYMENT_RETURN.replace('bookingId="bk-1"', 'bookingId="bk-1" kind="rent"'),
      actions: {
        settleCardPayment: `async () => ({ ok: true, data: { bookingId: "bk-1", amountMinor: 50000000, confirmed: true, outcome: "settled" } })`,
      },
    });
    try {
      await sheetOpens(page, "Rent paid");
    } finally {
      await close();
    }
  });
});

const SHARE = `
  import { mount } from "@/lib/testing/browser-root";
  import { SettleShareOnReturn } from "@/components/app/tenancy/FlatmateControls";
  mount(<SettleShareOnReturn tenancyId="11111111-1111-4111-8111-111111111111" reference="rm-book-share1" />);
`;

run("a flatmate share paid", () => {
  it("opens for a share settled on this call, with its amount", async () => {
    const { page, close } = await mountInBrowser({
      entry: SHARE,
      actions: { settleShareReturn: `async () => ({ ok: true, data: { state: "share-settled", paidMinor: 1, totalMinor: 2, amountMinor: 25000000 } })` },
    });
    try {
      await sheetOpens(page, "Your share is paid");
      expect(await page.getByTestId("success-amount").textContent()).toContain("250,000");
    } finally {
      await close();
    }
  });

  it("says the move-in is paid in full when this share completed it", async () => {
    const { page, close } = await mountInBrowser({
      entry: SHARE,
      actions: { settleShareReturn: `async () => ({ ok: true, data: { state: "settled", paidMinor: null, totalMinor: 2, amountMinor: 1 } })` },
    });
    try {
      await sheetOpens(page, "Move-in paid in full");
    } finally {
      await close();
    }
  });

  it("does not open on a revisit (already recorded) or a refusal (still processing)", async () => {
    for (const answer of [
      `{ ok: true, data: { state: "already", paidMinor: null, totalMinor: null, amountMinor: null } }`,
      `{ ok: false, error: "The payment is still processing. It is recorded the moment it settles." }`,
    ]) {
      const { page, close } = await mountInBrowser({ entry: SHARE, actions: { settleShareReturn: `async () => (${answer})` } });
      try {
        await actionCalled(page, "settleShareReturn");
        await page.waitForFunction(() =>
          ((window as unknown as { __router?: { calls: unknown[][] } }).__router?.calls ?? []).some((c) => c[0] === "refresh"),
        );
        await noSheet(page);
      } finally {
        await close();
      }
    }
  });
});

const CRYPTO = (state: string) => `
  import { mount } from "@/lib/testing/browser-root";
  import { CryptoPaymentStatus } from "@/components/app/payments/crypto/CryptoPaymentStatus";
  const view = { id: "c1", reference: "rm-crypto-1", bookingId: "bk-1", state: ${JSON.stringify(state)}, asset: "USDT",
    network: "tron", assetName: "Tether", networkName: "Tron", decimals: 6, networkWarning: "Send on Tron only.",
    amountMinor: 50000000, feeMinor: 0, rate: "1600", cryptoAmount: "312.5", cryptoReceived: null, cryptoOverpaid: null,
    cryptoRefunded: null, depositAddress: "TXYZ", depositMemo: null, hostedUrl: null, refundAddress: null, txHash: null,
    refundTxHash: null, confirmations: null, confirmationsRequired: null, expiresAt: new Date(Date.now() + 600000).toISOString(),
    settledAt: null, providerPaymentId: null, createdAt: new Date().toISOString() };
  window.__view = view;
  mount(<CryptoPaymentStatus initial={view} locale="en" providerName="Provider" />);
`;

run("crypto payment settled", () => {
  it("opens on a live transition to settled", async () => {
    const { page, close } = await mountInBrowser({
      entry: CRYPTO("confirming"),
      actions: { cryptoPaymentStatus: `async () => ({ ok: true, data: { ...window.__view, state: "settled", cryptoReceived: "312.5" } })` },
    });
    try {
      await sheetOpens(page, "Crypto payment received");
    } finally {
      await close();
    }
  }, 20_000);

  it("does not open while it is still confirming, nor for a payment already settled on arrival", async () => {
    for (const [initial, polled] of [
      ["confirming", "confirming"],
      ["settled", "settled"],
    ] as const) {
      const { page, close } = await mountInBrowser({
        entry: CRYPTO(initial),
        actions: { cryptoPaymentStatus: `async () => ({ ok: true, data: { ...window.__view, state: ${JSON.stringify(polled)} } })` },
      });
      try {
        if (initial === "confirming") await actionCalled(page, "cryptoPaymentStatus");
        await noSheet(page);
      } finally {
        await close();
      }
    }
  }, 20_000);
});

/* --------------------------------------------------- viewings and more */

const REQUEST = `
  import { mount } from "@/lib/testing/browser-root";
  import { AuthGateProvider } from "@/components/auth/AuthGate";
  import { RequestInspection } from "@/components/app/inspections/RequestInspection";
  mount(<AuthGateProvider signedIn><RequestInspection listingId="l-1" existing={null} locale="en" /></AuthGateProvider>);
`;

async function requestAnInspection(page: Page) {
  await page.getByTestId("request-inspection").click();
  await page.getByTestId("inspection-when").fill("2030-01-15T10:00");
  await page.getByRole("button", { name: "Send the request" }).click();
}

run("inspection requested", () => {
  it("opens as a request (submitted), never as booked", async () => {
    const { page, close } = await mountInBrowser({
      entry: REQUEST,
      actions: { requestInspection: `async () => ({ ok: true, data: { id: "ix-1" } })` },
    });
    try {
      await requestAnInspection(page);
      await sheetOpens(page, "Inspection requested");
      expect(await page.locator('.nf-success[data-variant="submitted"]').count()).toBe(1);
    } finally {
      await close();
    }
  });

  it("does not open when the request is refused", async () => {
    const { page, close } = await mountInBrowser({
      entry: REQUEST,
      actions: { requestInspection: `async () => ({ ok: false, error: "That time has passed." })` },
    });
    try {
      await requestAnInspection(page);
      await page.getByText("That time has passed.").waitFor();
      await noSheet(page);
    } finally {
      await close();
    }
  });
});

const SLOTS = `
  import { mount } from "@/lib/testing/browser-root";
  import { getDictionary } from "@vallo/i18n";
  import { ViewingSlots } from "@/components/app/inspections/ViewingSlots";
  mount(<ViewingSlots listingId="l-1" locale="en" copy={getDictionary("en").frontDoor.viewings}
    slots={[{ slotAt: "2030-01-15T09:00:00.000Z", minutes: 30, windowId: "w1" }]} />);
`;

run("inspection (viewing) booked", () => {
  it("opens with the time once the slot is booked", async () => {
    const { page, close } = await mountInBrowser({ entry: SLOTS, actions: { bookViewingSlot: `async () => ({ ok: true, data: { id: "ix-9" } })` } });
    try {
      await page.getByTestId("viewing-slot").first().click();
      await page.getByRole("button", { name: /^Book / }).click();
      await sheetOpens(page, "Inspection booked");
    } finally {
      await close();
    }
  });

  it("does not open when the slot was taken", async () => {
    const { page, close } = await mountInBrowser({ entry: SLOTS, actions: { bookViewingSlot: `async () => ({ ok: false, error: "That time was just taken." })` } });
    try {
      await page.getByTestId("viewing-slot").first().click();
      await page.getByRole("button", { name: /^Book / }).click();
      await page.getByText("That time was just taken.").waitFor();
      await noSheet(page);
    } finally {
      await close();
    }
  });
});

const DRAW = `
  import { mount } from "@/lib/testing/browser-root";
  import { DrawUpAgreement } from "@/components/app/agreements/DrawUpAgreement";
  mount(<DrawUpAgreement inspectionId="ix-1" minDate="2030-01-01" />);
`;

run("agreement drawn up", () => {
  it("sends the person to the agreement WITH the moment named on the ok path only", async () => {
    const ok = await mountInBrowser({ entry: DRAW, actions: { openRentAgreement: `async () => ({ ok: true, data: { agreementId: "ag-1" } })` } });
    try {
      await ok.page.getByTestId("draw-up-agreement").evaluate((form) => (form as HTMLFormElement).requestSubmit());
      await ok.page.waitForFunction(() =>
        ((window as unknown as { __router?: { calls: unknown[][] } }).__router?.calls ?? []).some((c) => c[0] === "push"),
      );
      expect((await routerCalls(ok.page)).find((c) => c[0] === "push")?.[1]).toBe("/agreements/ag-1?done=agreement-drawn");
    } finally {
      await ok.close();
    }
    const refused = await mountInBrowser({ entry: DRAW, actions: { openRentAgreement: `async () => ({ ok: false, error: "The report is not submitted yet." })` } });
    try {
      await refused.page.getByTestId("draw-up-agreement").evaluate((form) => (form as HTMLFormElement).requestSubmit());
      await refused.page.getByText("The report is not submitted yet.").waitFor();
      expect(await routerCalls(refused.page)).toEqual([]);
    } finally {
      await refused.close();
    }
  });
});

const CONFIRM = `
  import { mount } from "@/lib/testing/browser-root";
  import { ConfirmTerms } from "@/components/app/agreements/AgreementControls";
  mount(<ConfirmTerms agreementId="ag-1" version={2} />);
`;

run("agreement confirmed", () => {
  it("returns to the agreement with the moment named on ok, and stays put on a refusal", async () => {
    const ok = await mountInBrowser({
      entry: CONFIRM,
      url: "http://vallo.test/agreements/ag-1",
      actions: { confirmAgreement: `async () => ({ ok: true, data: { status: "in_review" } })` },
    });
    try {
      await ok.page.getByRole("checkbox").check();
      await ok.page.getByRole("button", { name: "Confirm these terms" }).click();
      await ok.page.waitForFunction(() =>
        ((window as unknown as { __router?: { calls: unknown[][] } }).__router?.calls ?? []).some((c) => c[0] === "replace"),
      );
      expect((await routerCalls(ok.page)).find((c) => c[0] === "replace")?.[1]).toBe("/agreements/ag-1?done=agreement-confirmed");
    } finally {
      await ok.close();
    }
    const refused = await mountInBrowser({ entry: CONFIRM, actions: { confirmAgreement: `async () => ({ ok: false, error: "These terms changed." })` } });
    try {
      await refused.page.getByRole("checkbox").check();
      await refused.page.getByRole("button", { name: "Confirm these terms" }).click();
      await refused.page.getByText("These terms changed.").waitFor();
      expect((await routerCalls(refused.page)).filter((c) => c[0] === "replace")).toEqual([]);
    } finally {
      await refused.close();
    }
  });
});

const ARRIVAL = (show: boolean, seenKey?: string) => `
  import { mount } from "@/lib/testing/browser-root";
  import { SuccessFromFlag } from "@/components/ui/SuccessFromFlag";
  mount(<SuccessFromFlag show={${show}} moment="agreementDrawn" ${seenKey ? `seenKey=${JSON.stringify(seenKey)}` : ""} />);
`;

run("on arrival (agreement, listing and approval pages)", () => {
  it("opens when the page says the record backs the flag, and strips the flag", async () => {
    const { page, close } = await mountInBrowser({ entry: ARRIVAL(true), url: "http://vallo.test/agreements/ag-1?done=agreement-drawn" });
    try {
      await sheetOpens(page, "Agreement drawn up");
      expect((await routerCalls(page)).find((c) => c[0] === "replace")?.[1]).toBe("/agreements/ag-1");
    } finally {
      await close();
    }
  });

  it("does not open when the record does not back it", async () => {
    const { page, close } = await mountInBrowser({ entry: ARRIVAL(false), url: "http://vallo.test/agreements/ag-1?done=agreement-drawn" });
    try {
      await noSheet(page);
    } finally {
      await close();
    }
  });

  it("an approval opens once per device: it marks itself seen, and a seen one stays shut", async () => {
    const first = await mountInBrowser({ entry: ARRIVAL(true, "agreement-approved:ag-1") });
    try {
      await sheetOpens(first.page);
      expect(await first.page.evaluate(() => window.localStorage.getItem("nf-seen:agreement-approved:ag-1"))).toBe("1");
      /* No flag rode on this one, so there is nothing to strip. */
      expect((await routerCalls(first.page)).filter((c) => c[0] === "replace")).toEqual([]);
    } finally {
      await first.close();
    }
    const again = await mountInBrowser({
      entry: ARRIVAL(true, "agreement-approved:ag-1"),
      init: `window.localStorage.setItem("nf-seen:agreement-approved:ag-1", "1")`,
    });
    try {
      await noSheet(again.page);
    } finally {
      await again.close();
    }
  });
});

const REFUND = `
  import { mount } from "@/lib/testing/browser-root";
  import { getDictionary } from "@vallo/i18n";
  import { RefundRequestForm } from "@/components/app/after-gate/RefundRequestForm";
  mount(<RefundRequestForm bookingId="bk-1" copy={getDictionary("en").afterTheGate.refund} reasons={[{ code: "guest_choice", label: "My plans changed" }]} />);
`;

run("refund requested", () => {
  it("opens as requested (never refunded), and refreshes the page only when it closes", async () => {
    const { page, close } = await mountInBrowser({ entry: REFUND, actions: { requestRefund: `async () => ({ ok: true, data: null })` } });
    try {
      await page.getByTestId("refund-request").evaluate((form) => (form as HTMLFormElement).requestSubmit());
      await sheetOpens(page, "Refund requested");
      expect((await routerCalls(page)).filter((c) => c[0] === "refresh")).toEqual([]);
      await page.getByTestId("success-primary").click();
      await page.waitForFunction(() =>
        ((window as unknown as { __router?: { calls: unknown[][] } }).__router?.calls ?? []).some((c) => c[0] === "refresh"),
      );
    } finally {
      await close();
    }
  });

  it("does not open when the ask is refused", async () => {
    const { page, close } = await mountInBrowser({ entry: REFUND, actions: { requestRefund: `async () => ({ ok: false, error: "This stay has not been paid." })` } });
    try {
      await page.getByTestId("refund-request").evaluate((form) => (form as HTMLFormElement).requestSubmit());
      await page.getByText("This stay has not been paid.").waitFor();
      await noSheet(page);
    } finally {
      await close();
    }
  });
});

const TABLE = `
  import { mount } from "@/lib/testing/browser-root";
  import { ReserveTable } from "@/app/(app)/listing/[id]/ReserveTable";
  mount(<ReserveTable listingId="l-1" />);
`;

run("table requested", () => {
  it("opens as a request sent, never as booked", async () => {
    const { page, close } = await mountInBrowser({ entry: TABLE, actions: { reserveTable: `async () => ({ ok: true, data: { reservationId: "r1", status: "PENDING" } })` } });
    try {
      await page.getByRole("button", { name: "Request a table" }).click();
      await sheetOpens(page, "Table request sent");
    } finally {
      await close();
    }
  });

  it("does not open when the restaurant cannot take it", async () => {
    const { page, close } = await mountInBrowser({ entry: TABLE, actions: { reserveTable: `async () => ({ ok: false, error: "The restaurant is closed that day." })` } });
    try {
      await page.getByRole("button", { name: "Request a table" }).click();
      await page.getByText("The restaurant is closed that day.").waitFor();
      await noSheet(page);
    } finally {
      await close();
    }
  });
});

const VNIN = `
  import { mount } from "@/lib/testing/browser-root";
  import { getDictionary } from "@vallo/i18n";
  import { VninPanel } from "@/components/verification/VninPanel";
  mount(<VninPanel copy={getDictionary("en").trustVisible.vnin} merchantCode="M1" />);
`;

async function sendVnin(page: Page) {
  await page.getByLabel("Virtual NIN").fill("AB1234567890CD");
  await page.getByRole("button", { name: "Confirm with NIMC" }).click();
}

run("identity matched (vNIN)", () => {
  it("opens only when the server says passed", async () => {
    const { page, close } = await mountInBrowser({ entry: VNIN, actions: { verifyIdentityWithVnin: `async () => ({ ok: true, data: { status: "passed", message: "Matched." } })` } });
    try {
      await sendVnin(page);
      await sheetOpens(page, "Identity matched");
    } finally {
      await close();
    }
  });

  it("does not open while NIMC is still answering, or on a refusal", async () => {
    for (const answer of [
      `{ ok: true, data: { status: "pending", message: "NIMC has not answered yet." } }`,
      `{ ok: false, error: "That vNIN has expired." }`,
    ]) {
      const { page, close } = await mountInBrowser({ entry: VNIN, actions: { verifyIdentityWithVnin: `async () => (${answer})` } });
      try {
        await sendVnin(page);
        await page.getByText(/NIMC has not answered yet|That vNIN has expired/).waitFor();
        await noSheet(page);
      } finally {
        await close();
      }
    }
  });
});

const CONTACT = `
  import { mount } from "@/lib/testing/browser-root";
  import { ContactForm } from "@/app/(site)/contact/ContactForm";
  mount(<ContactForm />);
`;

run("support ticket filed (contact form)", () => {
  it("opens with the reference on ok, and not on a refusal", async () => {
    const ok = await mountInBrowser({ entry: CONTACT, actions: { submitContactForm: `async () => ({ ok: true, data: { reference: "SUP-4821" } })` } });
    try {
      await ok.page.locator("form").first().evaluate((form) => {
        (form as HTMLFormElement).noValidate = true;
        (form as HTMLFormElement).requestSubmit();
      });
      await sheetOpens(ok.page, "Message sent");
      expect(await ok.page.locator(".nf-success__mono").textContent()).toBe("SUP-4821");
    } finally {
      await ok.close();
    }
    const refused = await mountInBrowser({ entry: CONTACT, actions: { submitContactForm: `async () => ({ ok: false, error: "Add a message." })` } });
    try {
      await refused.page.locator("form").first().evaluate((form) => {
        (form as HTMLFormElement).noValidate = true;
        (form as HTMLFormElement).requestSubmit();
      });
      await actionCalled(refused.page, "submitContactForm");
      await noSheet(refused.page);
    } finally {
      await refused.close();
    }
  });
});

const REPORT = `
  import { mount } from "@/lib/testing/browser-root";
  import { ReportSheet } from "@/components/app/ReportSheet";
  mount(<ReportSheet targetType="listing" targetId="l-1" targetLabel="Two-bedroom flat" signedIn />);
`;

run("report submitted", () => {
  it("opens once the report is on file, and not on a refusal", async () => {
    for (const [answer, opens] of [
      [`{ ok: true, data: { targetId: "l-1", category: "scam" } }`, true],
      [`{ ok: false, error: "Choose what is wrong." }`, false],
    ] as const) {
      const { page, close } = await mountInBrowser({ entry: REPORT, actions: { reportSomething: `async () => (${answer})` } });
      try {
        await page.getByTestId("report-opener").click();
        await page.getByTestId("report-sheet").waitFor();
        await page.locator('[data-testid="report-sheet"] form').evaluate((form) => {
          (form as HTMLFormElement).noValidate = true;
          (form as HTMLFormElement).requestSubmit();
        });
        if (opens) await sheetOpens(page, "Report received");
        else {
          await actionCalled(page, "reportSomething");
          await noSheet(page);
        }
      } finally {
        await close();
      }
    }
  });
});

/* ------------------------------------------------ the account moments */

const HOST = `
  import { mount } from "@/lib/testing/browser-root";
  import { SuccessFlagHost } from "@/components/ui/SuccessFlagHost";
  import { showSuccess } from "@/lib/ui/success-moments";
  window.__show = showSuccess;
  mount(<SuccessFlagHost />);
`;

run("account created, password changed, email verified, passcode set (the root layout's host)", () => {
  it("opens from ?done= and strips it", async () => {
    const { page, close } = await mountInBrowser({ entry: HOST, url: "http://vallo.test/home?done=password-changed" });
    try {
      await page.waitForSelector('[data-testid="success-sheet-account"]');
      expect(await page.getByRole("dialog").getAttribute("aria-labelledby")).toBeTruthy();
      expect((await routerCalls(page)).find((c) => c[0] === "replace")?.[1]).toBe("/home");
    } finally {
      await close();
    }
  });

  it("opens from showSuccess (the passcode screen's call)", async () => {
    const { page, close } = await mountInBrowser({ entry: HOST });
    try {
      await page.evaluate(() => (window as unknown as { __show: (f: string) => void }).__show("passcode-set"));
      await page.waitForSelector('[data-testid="success-sheet-account"]');
      expect(await page.getByRole("dialog", { name: "Passcode set" }).count()).toBe(1);
    } finally {
      await close();
    }
  });

  it("refuses a record's flag: those are the record's page's to check", async () => {
    const { page, close } = await mountInBrowser({ entry: HOST, url: "http://vallo.test/home?done=agreement-drawn" });
    try {
      await page.evaluate(() => (window as unknown as { __show: (f: string) => void }).__show("listing-live"));
      await page.waitForTimeout(300);
      expect(await page.locator('[data-testid="success-sheet-account"]').count()).toBe(0);
    } finally {
      await close();
    }
  });
});
