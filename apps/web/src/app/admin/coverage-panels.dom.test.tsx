/**
 * THE READ-ONLY COVERAGE PANELS, mounted for real at phone width in Chromium
 * with axe over them: the ledger books on the money desk, the withdrawal fee
 * schedule and quote on the fees desk, and the fee acceptance on the listing
 * review. Each is drawn in every state it has, and none states a figure the
 * read did not give it. One state per mount, because a page holds one of each
 * landmark.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BROWSER_TEST_TIMEOUT, closeBrowser, hasBrowser, mountInBrowser, warmBrowser } from "@/lib/testing/mount-in-browser";
import { axeViolations } from "@/components/ui/ported-test-css";
import { productCss } from "@/lib/testing/product-css";

vi.setConfig({ testTimeout: BROWSER_TEST_TIMEOUT });
beforeAll(warmBrowser);
afterAll(closeBrowser);

const ledgerEntry = (read: string) => `
  import { LedgerBooks } from "@/app/admin/money/LedgerBooks";
  import { mount } from "@/lib/testing/browser-root";
  const books = [
    { pot: "customer_funds", entries: 3, lines: [{ currency: "NGN", balanceMinor: 25000000, entries: 3 }] },
    { pot: "vallo_revenue", entries: 1, lines: [{ currency: "NGN", balanceMinor: 500000, entries: 1 }] },
  ];
  mount(<div style={{ width: 360, padding: 16 }}><LedgerBooks locale="en" read={${read}} /></div>);
`;

const feesEntry = (quote: string) => `
  import { WithdrawalFees } from "@/app/admin/fees/WithdrawalFees";
  import { mount } from "@/lib/testing/browser-root";
  const schedule = {
    policyVersion: "2026-10-06.1", effectiveFrom: "2026-10-05T23:00:00Z", minimumMinor: 100000,
    bands: [
      { id: 1, fromMinor: 100000, toMinor: 10000000, flatFeeMinor: 5000, feeBps: null, feeCapMinor: null, confirmed: true },
      { id: 4, fromMinor: 200000000, toMinor: null, flatFeeMinor: null, feeBps: null, feeCapMinor: null, confirmed: false },
    ],
  };
  mount(<div style={{ width: 360, padding: 16 }}><WithdrawalFees locale="en" read={{ state: "ok", schedule, quote: ${quote} }} /></div>);
`;

const acceptanceEntry = (read: string) => `
  import { FeeAcceptancePanel } from "@/app/admin/listings/[id]/FeeAcceptancePanel";
  import { mount } from "@/lib/testing/browser-root";
  const acceptance = {
    id: "a1", acceptedAt: "2026-10-07T09:00:00Z", termsVersion: "2026-10-06", policyVersion: "2026-10-06.1",
    rentMinor: 150000000, commissionBps: 200, protectionBps: 100, feeLowMinor: 3000000, feeHighMinor: 4500000,
    receiveLowMinor: 145500000, receiveHighMinor: 147000000,
  };
  mount(<div style={{ width: 360, padding: 16 }}><FeeAcceptancePanel locale="en" read={${read}} /></div>);
`;

async function shown(entry: string, css: string) {
  const mounted = await mountInBrowser({ entry, css });
  const body = await mounted.page.locator("body").innerText();
  return { ...mounted, body };
}

describe.skipIf(!hasBrowser && !process.env.CI)("the ledger books on the money desk", () => {
  it("draws each book with its balance and passes axe", async () => {
    const { page, close, body } = await shown(ledgerEntry('{ state: "ok", books }'), productCss());
    try {
      expect(body).toContain("Customer money at the payment partner");
      expect(body).toContain("Never Vallo's money");
      expect(body).toContain("₦250,000");
      expect(body).toContain("Vallo revenue");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("says empty is empty and unreadable is unreadable, never a zero", async () => {
    const empty = await shown(ledgerEntry('{ state: "ok", books: [] }'), productCss());
    try {
      expect(empty.body).toContain("No ledger entries yet");
      expect(await axeViolations(empty.page)).toEqual([]);
    } finally {
      await empty.close();
    }
    const down = await shown(ledgerEntry('{ state: "unavailable" }'), productCss());
    try {
      expect(down.body).toContain("could not be read");
      expect(down.body).not.toContain("₦0");
    } finally {
      await down.close();
    }
  });
});

const QUOTES = {
  none: "null",
  fee: '{ asked: "50000", minor: 5000000, answer: { status: "ok", amountMinor: 5000000, feeMinor: 5000 } }',
  refused: '{ asked: "5000000", minor: 500000000, answer: { status: "band_unconfirmed" } }',
};

describe.skipIf(!hasBrowser && !process.env.CI)("the withdrawal fee schedule on the fees desk", () => {
  it("shows the bands, flags the unconfirmed one, and passes axe", async () => {
    const { page, close, body } = await shown(feesEntry(QUOTES.none), productCss());
    try {
      expect(body).toContain("Smallest withdrawal");
      expect(body).toContain("₦50 flat");
      expect(body).toContain("Not confirmed");
      expect(body).toContain("No rate set");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("answers a quote with the fee and what is paid out", async () => {
    const { page, close, body } = await shown(feesEntry(QUOTES.fee), productCss());
    try {
      expect(body).toContain("Paid out after the fee");
      expect(await page.getByTestId("withdrawal-quote-answer").innerText()).toContain("₦50");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("gives no quote in a band nobody has confirmed, and says why", async () => {
    const { close, body } = await shown(feesEntry(QUOTES.refused), productCss());
    try {
      expect(body).toContain("not confirmed, so there is no quote");
      expect(body).not.toContain("Paid out after the fee");
    } finally {
      await close();
    }
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the fee acceptance on the listing review", () => {
  const css = productCss("app/admin/_review/review.css");

  it("shows what the lister accepted and passes axe", async () => {
    const { page, close, body } = await shown(acceptanceEntry('{ state: "ok", acceptance }'), css);
    try {
      expect(body).toContain("Accepted 7 Oct 2026");
      expect(body).toContain("Terms version 2026-10-06");
      expect(body).toContain("₦1,500,000");
      expect(body).toContain("2%");
      expect(await axeViolations(page)).toEqual([]);
    } finally {
      await close();
    }
  });

  it("says when nothing was accepted or the read failed, and hides itself outside the door", async () => {
    for (const [read, expected] of [
      ['{ state: "ok", acceptance: null }', "has not accepted fee terms"],
      ['{ state: "unavailable" }', "could not be read"],
    ] as const) {
      const { close, body } = await shown(acceptanceEntry(read), css);
      try {
        expect(body).toContain(expected);
      } finally {
        await close();
      }
    }
    const hidden = await shown(acceptanceEntry('{ state: "forbidden" }'), css);
    try {
      expect(hidden.body.trim()).toBe("");
    } finally {
      await hidden.close();
    }
  });
});
