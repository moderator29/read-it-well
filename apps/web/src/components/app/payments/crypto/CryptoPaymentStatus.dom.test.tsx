/**
 * The crypto receipt is paper only when the charge is paid (audit A5).
 *
 * `settled` is the one state in which the charge IS paid (state-machine.ts),
 * so it alone gets the printable document headed "Charge paid" over the naira
 * figure. A refund ("The charge is not paid") and an overpayment still being
 * converted keep their facts on the plain card, with no title and no hero
 * figure, so nothing printable claims a payment that has not happened.
 *
 * The view is a structural fixture: the shape `CryptoPaymentView` has, with
 * values that only say which slot they are.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CryptoPaymentView } from "@/lib/crypto/view";

vi.mock("@/lib/crypto/actions", () => ({ cryptoPaymentStatus: async () => ({ ok: false }) }));

import { getDictionary } from "@vallo/i18n";
import { CopyScope } from "@/lib/i18n/copy-scope";
import { copyScopeOf } from "@/lib/i18n/copy-scope-of";
import { CryptoPaymentStatus } from "./CryptoPaymentStatus";

const view = (state: string): CryptoPaymentView =>
  ({
    id: "c1",
    reference: "rm-crypto-1",
    bookingId: "bk-1",
    state,
    asset: "USDT",
    network: "tron",
    assetName: "Tether",
    networkName: "Tron",
    decimals: 6,
    networkWarning: "Send on Tron only.",
    amountMinor: 50000000,
    feeMinor: 0,
    rate: "1600",
    cryptoAmount: "312.5",
    cryptoReceived: "312.5",
    cryptoOverpaid: null,
    cryptoRefunded: null,
    depositAddress: "TXYZ",
    depositMemo: null,
    hostedUrl: null,
    refundAddress: "TREFUND",
    txHash: "0xtx",
    refundTxHash: null,
    confirmations: null,
    confirmationsRequired: null,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
    settledAt: null,
    providerPaymentId: null,
    createdAt: new Date().toISOString(),
  }) as unknown as CryptoPaymentView;

const draw = (state: string) =>
  /* The route's layout provides these words (RouteCopy); the test does the same. */
  renderToStaticMarkup(
    <CopyScope copy={copyScopeOf(getDictionary("en"), ["cryptoPay", "success"])}>
      <CryptoPaymentStatus initial={view(state)} locale="en" providerName="Provider" />
    </CopyScope>,
  );

describe("the crypto receipt", () => {
  it("is the printable document headed Charge paid when the charge is settled", () => {
    const html = draw("settled");
    expect(html).toContain('data-testid="crypto-receipt"');
    expect(html).toContain("Charge paid");
    expect(html).toContain('data-testid="crypto-receipt-figure"');
  });

  it.each(["refunded", "overpaid"])("is never a Charge paid document when the payment is %s", (state) => {
    const html = draw(state);
    expect(html).not.toContain('data-testid="crypto-receipt"');
    expect(html).not.toContain("Charge paid");
    expect(html).not.toContain('data-testid="crypto-receipt-figure"');
    /* The facts that trace the crypto are still there, on the plain card. */
    expect(html).toContain('data-testid="crypto-facts"');
    expect(html).toContain("TREFUND");
    expect(html).toContain("rm-crypto-1");
  });
});
