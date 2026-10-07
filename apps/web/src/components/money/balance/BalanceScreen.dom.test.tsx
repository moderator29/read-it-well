import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MovementView } from "@/lib/money/member-wallet";
import type { BalanceFigures } from "@/lib/money/funds";
import { HELD_BY } from "@/lib/money/balance-copy";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock("@/lib/money/member-wallet-actions", () => ({
  balanceMovementStatus: vi.fn(),
  cancelBalanceMovement: vi.fn(),
  checkBalanceBankAccount: vi.fn(),
  confirmBalanceMovement: vi.fn(),
  confirmDepositPaid: vi.fn(),
  findBalanceRecipient: vi.fn(),
  listBalanceBanks: vi.fn(),
  openBalanceAccount: vi.fn(),
  prepareDeposit: vi.fn(),
  prepareSend: vi.fn(),
  prepareWithdrawal: vi.fn(),
}));

const { BalanceScreen } = await import("./BalanceScreen");
const { WaitingRoom } = await import("./balance-ui");
const { BalanceOnboarding } = await import("./BalanceOnboarding");

/* Test values only, the founder's section 37 figures. */
const AT = "2026-10-07T10:00:00.000Z";
const NOW = Date.parse(AT) + 3 * 60_000;
const figures: BalanceFigures = {
  available: { minor: 2_450_000_00, confirmedAt: AT },
  protected: { minor: 850_000_00, confirmedAt: AT },
  pending: { minor: 50_000_00, confirmedAt: AT },
  processing: { minor: 0, confirmedAt: null },
  currency: "NGN",
};
const withdrawal: MovementView = {
  id: "6b1f1c1e-1111-4a4a-8888-000000000001",
  kind: "withdrawal",
  status: "processing",
  amountMinor: 250_000_00,
  providerFeeMinor: 50_00,
  currency: "NGN",
  counterparty: { bank: "Test Bank", last4: "4821", name: "ADA EZE" },
  reference: "rm-plw-6b1f1c1e-1111-4a4a-8888-000000000001",
  createdAt: AT,
  observedAt: AT,
  confirmedByProvider: false,
};

function render(live: boolean, movements: MovementView[] = [withdrawal]) {
  return renderToStaticMarkup(<BalanceScreen figures={figures} movements={movements} live={live} locale="en" now={NOW} />);
}

describe("the balance screen", () => {
  it("leads with Available, says when it was confirmed, and shows the other three apart from it", () => {
    const html = render(true);
    expect(html).toContain("2,450,000");
    expect(html).toContain("Confirmed 3 minutes ago");
    for (const label of ["Held for a deal", "Pending", "Processing"]) expect(html).toContain(label);
    expect(html).toContain("850,000");
  });

  it("names who holds the money once, and nowhere else names the provider", () => {
    const html = render(true);
    expect(html.split("Payluk").length - 1).toBe(1);
    expect(html).toContain(HELD_BY.replace(/,/g, ","));
  });

  it("moves no money on figures it could not refresh", () => {
    const stale = render(false);
    expect(stale).toContain("last figures we confirmed");
    for (const a of ["add", "withdraw", "send"]) expect(stale).toMatch(new RegExp(`disabled=""[^>]*data-testid="balance-action-${a}"`));
    const live = render(true);
    expect(live).not.toMatch(/disabled=""[^>]*data-testid="balance-action-withdraw"/);
  });

  it("keeps a movement that is still on its way at the top, in words, not as done", () => {
    const html = render(true);
    expect(html).toContain("Still moving");
    expect(html).toContain("On its way to your bank");
    expect(html).not.toContain("Completed");
  });

  it("has an empty state that says what will appear", () => {
    expect(render(true, [])).toContain("Nothing has moved yet");
  });
});

describe("the waiting room", () => {
  it("ticks only what the record says, and promises no time", () => {
    const html = renderToStaticMarkup(<WaitingRoom movement={withdrawal} locale="en" kind="withdrawal" />);
    expect(html).toContain('data-status="processing"');
    expect((html.match(/data-done="true"/g) ?? []).length).toBe(1);
    expect(html).toContain("You will not be charged twice");
    expect(html).not.toMatch(/%|seconds/);
  });

  it("an unknown outcome tells the member not to try again", () => {
    const html = renderToStaticMarkup(<WaitingRoom movement={{ ...withdrawal, status: "unknown" }} locale="en" kind="withdrawal" />);
    expect(html).toContain("Please do not try again");
  });

  it("done is said only for a completed movement", () => {
    const html = renderToStaticMarkup(<WaitingRoom movement={{ ...withdrawal, status: "completed" }} locale="en" kind="withdrawal" />);
    expect(html).toContain("Confirmed. This is done.");
    expect((html.match(/data-done="true"/g) ?? []).length).toBe(3);
  });
});

describe("financial onboarding", () => {
  it("is not a form: it explains, lists what is missing, and opens with one button", () => {
    const html = renderToStaticMarkup(<BalanceOnboarding state="VERIFICATION_REQUIRED" gaps={["phone"]} />);
    expect(html).not.toContain("<input");
    expect(html).toContain("A Nigerian mobile number");
    expect(html).toContain("/settings/phone");
    expect(html).toContain("Vallo never holds it");
  });
});
