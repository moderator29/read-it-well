import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it } from "vitest";
import { axe, closeAxe, hasBrowser } from "@/lib/a11y/axe";
import type { ListerFeePolicy } from "@/lib/money/lister-fee";
import { ListerFeeGate } from "./ListerFeeGate";

afterAll(closeAxe);

/* A policy row as a test value: the founder's worked example. */
const policy: ListerFeePolicy = { rateVersion: "v-test", rail: "protected", feeBps: 400, capMinor: null };
const noop = () => undefined;

function gate(over: Partial<Parameters<typeof ListerFeeGate>[0]> = {}): string {
  return renderToStaticMarkup(
    <ListerFeeGate kind="rent" priceMinor={1_800_000_00} policy={policy} locale="en" accepted={null} onAcceptedChange={noop} {...over} />,
  );
}

describe("the lister's fee gate", () => {
  it("shows the three figures in naira, on the lister's own price", () => {
    const html = gate();
    expect(html).toContain("Rent you set");
    expect(html).toContain("Platform fee (4%)");
    expect(html).toContain("You receive");
    expect(html).toMatch(/data-testid="fee-gate-price"[\s\S]*1,800,000/);
    expect(html).toMatch(/data-testid="fee-gate-fee"[\s\S]*72,000/);
    expect(html).toMatch(/data-testid="fee-gate-receive"[\s\S]*1,728,000/);
  });

  it("frames the sales line as what the lister keeps", () => {
    expect(gate()).toMatch(/you keep 96 percent instead of 90: ₦108,000 more on ₦1,800,000/);
  });

  it("is open until the explicit accept, and accepted only for these figures", () => {
    expect(gate()).toContain('data-state="open"');
    const accepted = { rateVersion: "v-test", priceMinor: 1_800_000_00, feeMinor: 72_000_00, receiveMinor: 1_728_000_00 };
    expect(gate({ accepted })).toContain('data-state="accepted"');
    expect(gate({ accepted, priceMinor: 1_900_000_00 })).toContain('data-state="open"');
  });

  it("says it cannot show figures when the policy could not be read, and offers no accept", () => {
    const html = gate({ policy: null });
    expect(html).toContain('data-state="unreadable"');
    expect(html).not.toContain("fee-gate-accept");
    expect(html).not.toMatch(/4%|400/);
  });

  it("asks for a price rather than drawing a zero", () => {
    const html = gate({ priceMinor: null });
    expect(html).toContain('data-state="no-figure"');
    expect(html).not.toContain("₦0");
  });
});

describe.skipIf(!hasBrowser && !process.env.CI)("the lister's fee gate (axe)", () => {
  it.each([
    ["open", {}],
    ["unreadable", { policy: null }],
    ["no figure", { priceMinor: null }],
  ] as const)("%s has no axe violations", async (_name, over) => {
    expect(await axe(`<h1>List a property</h1><h2>Send for review</h2>${gate(over)}`)).toEqual([]);
  });
});
