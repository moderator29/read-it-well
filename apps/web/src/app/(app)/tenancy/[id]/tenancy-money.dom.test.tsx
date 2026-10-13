/**
 * THE TENANCY FILE'S MONEY SHEET AS EVIDENCE (brief section 5, D61).
 *
 * The money block of `/tenancy/[id]` is drawn as paper and printed ("Print or
 * save as PDF"): a tenant takes it to a bank or a tribunal. It once said "Paid
 * in total" whether or not anything had been paid. So its money statements are
 * read word for word for the same tenancy unpaid, part-paid, paid, and paid
 * then void (cancelled, refunded or reversed), beside
 * the complaint pack's (`complaint/complaint-pack.dom.test.tsx`):
 *
 *   - the sheet is a receipt (torn edge) only when paid;
 *   - the figure's label and the total row's label;
 *   - the payments section: the no-payment sentence, or one row per payment;
 *   - the share and dispute tiles, the receipt-code panel and the complaint
 *     door, which are a paid tenancy's only.
 *
 * Fixtures: `app/(dev)/preview/f3/tenancy-file-states.ts`. NOT MEASURED, for want of a
 * fixture: the processor reference row, the caution register.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getDictionary } from "@vallo/i18n";
import { ClientCopyProvider } from "@/lib/i18n/client-copy";
import { clientCopyOf } from "@/lib/i18n/client-copy-of";
import type { TenancyFile } from "@/lib/tenancy/queries";
import {
  TENANCY_FILE_PAID,
  TENANCY_FILE_PAID_THEN_VOID,
  TENANCY_FILE_PART_PAID,
  TENANCY_FILE_UNPAID,
} from "@/app/(dev)/preview/f3/tenancy-file-states";

const read = vi.hoisted(() => ({ file: null as TenancyFile | null }));
vi.mock("@/lib/tenancy/queries", () => ({ getTenancyFile: async () => ({ state: "ready", file: read.file }) }));
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("@/components/app/feature-onboarding/first-run-store", () => ({ gateFirstRun: async () => {} }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
import TenancyPage from "./page";

const decode = (run: string) =>
  run.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
const textRuns = (html: string) => html.replace(/<!-- -->/g, "").split(/<[^>]+>/).map(decode).filter(Boolean);

/** The whole page's markup, and the money sheet's text runs. */
async function file(f: TenancyFile): Promise<{ html: string; sheet: string; runs: string[] }> {
  read.file = f;
  const page = await TenancyPage({ params: Promise.resolve({ id: f.id }), searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(<ClientCopyProvider copy={clientCopyOf(getDictionary("en"))}>{page}</ClientCopyProvider>);
  const start = html.indexOf('data-testid="tenancy-money"');
  const end = html.indexOf('data-testid="tenancy-money-print"');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const sheet = html.slice(html.lastIndexOf("<", start), html.lastIndexOf("<", end));
  return { html, sheet, runs: textRuns(sheet) };
}

const TOTAL = TENANCY_FILE_UNPAID.total;
const MOVE_IN_TOTAL = "Move-in total";
const PAID_IN_TOTAL = "Paid in total";
const NO_PAYMENT = "No payment has settled against this tenancy yet.";
/** The figure's label and the total row's label: the same words, twice. */
const labelled = (runs: string[], label: string) => runs.flatMap((run, i) => (run === label ? [runs[i + 1]] : []));

describe("the tenancy file's money sheet, unpaid", () => {
  it("is a document, not a receipt, and calls its figure the move-in total, never 'Paid in total'", async () => {
    const { sheet, runs } = await file(TENANCY_FILE_UNPAID);
    expect(sheet).toContain('data-doc-kind="document"');
    expect(sheet).not.toContain("nf-doc__perf");
    expect(labelled(runs, MOVE_IN_TOTAL)).toEqual([TOTAL, TOTAL]);
    expect(runs).not.toContain(PAID_IN_TOTAL);
  });

  it("says no payment has settled, and offers no share, dispute, receipt code or complaint", async () => {
    const { html, runs } = await file(TENANCY_FILE_UNPAID);
    expect(runs[runs.indexOf("Payments") + 1]).toBe(NO_PAYMENT);
    for (const paidOnly of ["tenancy-money-share", "tenancy-money-dispute", "tenancy-proof"]) expect(html).not.toContain(paidOnly);
    expect(html).not.toContain("/complaint");
  });
});

describe("the tenancy file's money sheet, part-paid", () => {
  const PART = TENANCY_FILE_PART_PAID.receipts[0]!;

  it("is a document, not a receipt, and calls its figure the move-in total, never 'Paid in total'", async () => {
    const { sheet, runs } = await file(TENANCY_FILE_PART_PAID);
    expect(sheet).toContain('data-doc-kind="document"');
    expect(sheet).not.toContain("nf-doc__perf");
    expect(labelled(runs, MOVE_IN_TOTAL)).toEqual([TOTAL, TOTAL]);
    expect(runs).not.toContain(PAID_IN_TOTAL);
  });

  it("lists the one payment that settled by its date and amount, with no reference row it does not have", async () => {
    const { html, runs } = await file(TENANCY_FILE_PART_PAID);
    expect(runs.slice(runs.indexOf("Payments") + 1)).toEqual([PART.date, PART.amount]);
    expect(runs).not.toContain(NO_PAYMENT);
    expect(runs).not.toContain("Reference");
    for (const paidOnly of ["tenancy-money-share", "tenancy-money-dispute", "tenancy-proof"]) expect(html).not.toContain(paidOnly);
    expect(html).not.toContain("/complaint");
  });
});

describe("the tenancy file's money sheet, fully paid", () => {
  const WHOLE = TENANCY_FILE_PAID.receipts[0]!;

  it("is a receipt with its torn edge, and its figure is 'Paid in total'", async () => {
    const { sheet, runs } = await file(TENANCY_FILE_PAID);
    expect(sheet).toContain('data-doc-kind="receipt"');
    expect(sheet).toContain("nf-doc__perf");
    expect(labelled(runs, PAID_IN_TOTAL)).toEqual([TOTAL, TOTAL]);
    expect(runs).not.toContain(MOVE_IN_TOTAL);
  });

  it("lists the payment of the whole total, and opens the share, the dispute and the complaint pack", async () => {
    const { html, runs } = await file(TENANCY_FILE_PAID);
    expect(runs.slice(runs.indexOf("Payments") + 1)).toEqual([WHOLE.date, TOTAL]);
    for (const paidOnly of ["tenancy-money-share", "tenancy-money-dispute", "tenancy-proof"]) expect(html).toContain(paidOnly);
    expect(html).toContain(`/tenancy/${TENANCY_FILE_PAID.id}/complaint`);
  });
});

describe("the tenancy file's money sheet, paid then void (cancelled, refunded or reversed)", () => {
  const WHOLE = TENANCY_FILE_PAID_THEN_VOID.receipts[0]!;

  it("is a document, not a receipt, and calls its figure the move-in total, never 'Paid in total'", async () => {
    const { sheet, runs } = await file(TENANCY_FILE_PAID_THEN_VOID);
    expect(sheet).toContain('data-doc-kind="document"');
    expect(sheet).not.toContain("nf-doc__perf");
    expect(labelled(runs, MOVE_IN_TOTAL)).toEqual([TOTAL, TOTAL]);
    expect(runs).not.toContain(PAID_IN_TOTAL);
  });

  it("still lists the payment that settled, and offers no share, dispute tile or receipt code it cannot make", async () => {
    const { html, runs } = await file(TENANCY_FILE_PAID_THEN_VOID);
    expect(runs.slice(runs.indexOf("Payments") + 1)).toEqual([WHOLE.date, TOTAL]);
    for (const paidOnly of ["tenancy-money-share", "tenancy-money-dispute", "tenancy-proof"]) expect(html).not.toContain(paidOnly);
  });
});
