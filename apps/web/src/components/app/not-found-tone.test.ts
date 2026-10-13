import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderClient } from "@/lib/testing/render-client";

/**
 * UI-15: "not found" is one neutral answer. It is never drawn in the failure
 * rose with a cross, and never under a success mark (the admin page drew the
 * emerald shield).
 */
const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");

describe("a missing record reads as neutral", () => {
  it("the member pages use the neutral missing state", () => {
    for (const file of [
      "app/(app)/bookings/[bookingId]/review/page.tsx",
      "app/(app)/rent/pay/[inspectionId]/page.tsx",
      "app/(app)/checkout/[bookingId]/page.tsx",
    ]) {
      const text = src(file);
      const at = text.indexOf('read.state === "missing"');
      expect(at, file).toBeGreaterThan(-1);
      const block = text.slice(at, text.indexOf("</Shell>", at));
      expect(block, file).toContain('state="missing"');
      expect(block, file).not.toContain('state="failed"');
    }
    expect(src("app/(app)/checkout/page.tsx")).toContain('state={detail ? "expired" : "missing"}');
  });

  it("a Record code that matches nobody, or fails, never wears the verified shield", () => {
    const text = src("app/(app)/record/[code]/page.tsx");
    expect(text).not.toContain('icon="shield-check"');
    expect(text).toContain('<State kind="empty" art={false} title={copy.lookupMissingTitle}');
  });

  it("the admin page uses the no-match mark, not the success shield", () => {
    expect(src("app/admin/bookings/[bookingId]/page.tsx")).toContain(
      '<ui.QueueEmpty title={copy.goneTitle} body={copy.goneBody} state="no-match" />',
    );
  });

  it("renders without an alert role or the error ink", async () => {
    const html = await renderClient(`
      import { renderToStaticMarkup } from "react-dom/server";
      import { ResultScreen } from "@/components/app/ResultSheet";
      export const html = () => renderToStaticMarkup(
        <ResultScreen state="missing" verdict="We could not find that stay" consequence="It may belong to another account." />);
    `);
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain("--nf-state-error");
    expect(html).toContain("--nf-content-muted");
  }, 30_000);
});
