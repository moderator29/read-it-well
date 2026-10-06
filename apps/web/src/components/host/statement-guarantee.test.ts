import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { statementCarriesGuarantee, type StatementLine } from "@/lib/host/statement";
import { renderClient } from "@/lib/testing/render-client";

/**
 * A STATEMENT NAMES THE GUARANTEE ONLY WHERE ONE WAS TAKEN (A9, D51).
 *
 * The Guarantee is retired, so a new payment carries no contribution, and the
 * statement printed a "Guarantee contribution ₦0" row, a Guarantee column and
 * a per-line Guarantee figure on every month, a charge that no longer exists.
 * They are drawn only where a line carried one: a payment made while it ran,
 * or the reversal of one.
 */
const line = (id: string, guaranteeMinor: number, kind: StatementLine["kind"] = "earning"): StatementLine => ({
  id,
  kind,
  occurredAt: "2026-10-04T10:00:00Z",
  day: "2026-10-04",
  title: "Example: Marina Court Hotel",
  reference: "VAL-8H2K1",
  bookingId: null,
  status: "succeeded",
  grossMinor: kind === "reversal" ? -9_000_000 : 9_000_000,
  commissionMinor: kind === "reversal" ? -180_000 : 180_000,
  guaranteeMinor,
  shareMinor: kind === "reversal" ? -8_820_000 + guaranteeMinor : 8_820_000 - guaranteeMinor,
});

describe("statementCarriesGuarantee", () => {
  it("is false on a month of payments made since the Guarantee was retired", () => {
    expect(statementCarriesGuarantee([line("a", 0), line("b", 0)])).toBe(false);
    expect(statementCarriesGuarantee([])).toBe(false);
  });
  it("is true where any line carried one, or reversed one", () => {
    expect(statementCarriesGuarantee([line("a", 0), line("b", 135_000)])).toBe(true);
    expect(statementCarriesGuarantee([line("c", -135_000, "reversal")])).toBe(true);
  });
});

describe("StatementView", () => {
  const sv = getDictionary("en").experienceHost.statementView;
  const w = getDictionary("en").experienceFeatures.workspace.statement;
  const render = (guaranteeMinor: number) =>
    renderClient(`
      import { renderToStaticMarkup } from "react-dom/server";
      import { StatementView } from "@/components/host/StatementView";
      const line = ${JSON.stringify(line("a", guaranteeMinor))};
      export const html = () => renderToStaticMarkup(
        <StatementView month="2026-10" thisMonth="2026-10" title="October 2026" lines={[line]} complete failed={false} locale="en" />);
    `);

  it("draws no Guarantee row, column or line figure on a new month, and all three on an old one", async () => {
    const [fresh, old] = await Promise.all([render(0), render(135_000)]);
    for (const label of [w.guarantee, `>${sv.colGuarantee}<`, sv.lineGuarantee]) {
      expect(fresh, label).not.toContain(label);
      expect(old, label).toContain(label);
    }
    /* The rest of the paper is unchanged. */
    expect(fresh).toContain(w.commission);
    expect(fresh).toContain(sv.colShare);
  }, 30_000);
});
