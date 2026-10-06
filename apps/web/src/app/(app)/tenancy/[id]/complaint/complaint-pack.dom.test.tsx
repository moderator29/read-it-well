/**
 * THE COMPLAINT PACK AS EVIDENCE (brief section 5, D61).
 *
 * The pack is a document a member may hand to a landlord, an agent or a
 * tribunal. It once said "Paid in total" on an unpaid tenancy, drew an unpaid
 * "Payments" list with a receipt-code offer under it, and named an unnamed
 * lister "the lister, lister." (d25c8e81c). So every money statement on it is
 * read here, word for word, for the same tenancy unpaid, part-paid, paid, and
 * paid then void (cancelled, refunded or reversed: auditor A9 found the pack
 * still said "Paid in total" there, where the tenancy file does not):
 *
 *   - the total's label;
 *   - the payments section (the no-payment sentence, or one line per payment);
 *   - the receipt-code line;
 *   - the parties sentence, with and without a named lister.
 *
 * The page is an async server component over one read, so it is called as the
 * function it is with that read stubbed and rendered to markup; no browser.
 * Fixtures: `app/(dev)/preview/f3/tenancy-file-states.ts` (every value's source is in it).
 * NOT MEASURED, for want of a fixture: a processor reference on a payment, a
 * working receipt code's "ending in" line, the caution and the demand letter.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getDictionary } from "@vallo/i18n";
import { ClientCopyProvider } from "@/lib/i18n/client-copy";
import { clientCopyOf } from "@/lib/i18n/client-copy-of";
import type { TenancyFile } from "@/lib/tenancy/queries";
import { RECEIPT_CODE_AFTER_FULL_PAYMENT, RECEIPT_CODE_VOID, TENANCY_VOID_STATEMENT } from "@/lib/money/copy";
import {
  NAMED_LISTER,
  TENANCY_FILE_PAID,
  TENANCY_FILE_PAID_THEN_VOID,
  TENANCY_FILE_PART_PAID,
  TENANCY_FILE_UNPAID,
  withLister,
} from "@/app/(dev)/preview/f3/tenancy-file-states";
import { STATES } from "@/app/(dev)/preview/session-b/sweep-orphans/fixtures";

const read = vi.hoisted(() => ({ file: null as TenancyFile | null }));
vi.mock("@/lib/tenancy/queries", () => ({ getTenancyFile: async () => ({ state: "ready", file: read.file }) }));
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("@/lib/social/areas-queries", () => ({ listStates: async () => STATES }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "vallo.test" }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
import ComplaintPage from "./page";

/** Every run of text the pack prints, one per text node, entities decoded. */
async function pack(file: TenancyFile): Promise<string[]> {
  read.file = file;
  const page = await ComplaintPage({ params: Promise.resolve({ id: file.id }) });
  /* The provider the root layout draws around every page. */
  const html = renderToStaticMarkup(<ClientCopyProvider copy={clientCopyOf(getDictionary("en"))}>{page}</ClientCopyProvider>);
  expect(html).toContain('data-testid="complaint-pack"');
  return html
    .replace(/<!-- -->/g, "")
    .split(/<[^>]+>/)
    .map((run) =>
      run
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim(),
    )
    .filter(Boolean);
}

/** The run after `label`: a total's figure, or what follows a heading. */
const after = (runs: string[], label: string) => runs[runs.indexOf(label) + 1];

const TENANT = TENANCY_FILE_UNPAID.tenantName!;
const TOTAL = TENANCY_FILE_UNPAID.total;
const NO_PAYMENT = "No payment has settled against this tenancy yet.";
const MAKE_A_CODE = "Make a receipt code in the tenancy file so anyone can check this payment.";
const PAID_IN_TOTAL = "Paid in total";
const NOT_PAID_IN_FULL = "Move-in total, not paid in full";

describe("the complaint pack's money statements, unpaid", () => {
  it("labels the total as not paid in full, never 'Paid in total'", async () => {
    const runs = await pack(TENANCY_FILE_UNPAID);
    expect(after(runs, NOT_PAID_IN_FULL)).toBe(TOTAL);
    expect(runs).not.toContain(PAID_IN_TOTAL);
  });

  it("says no payment has settled, lists none, and offers no receipt code", async () => {
    const runs = await pack(TENANCY_FILE_UNPAID);
    expect(after(runs, "Payments")).toBe(NO_PAYMENT);
    expect(runs.filter((run) => / on /.test(run) && run.includes("₦"))).toEqual([]);
    expect(runs.filter((run) => /receipt code/i.test(run))).toEqual([]);
  });

  it("prints no caution and no demand letter: no caution is recorded until the move-in is paid", async () => {
    const runs = await pack(TENANCY_FILE_UNPAID);
    expect(runs).not.toContain("The caution");
    expect(runs).not.toContain("Caution demand letter");
  });
});

describe("the complaint pack's money statements, part-paid", () => {
  const PART = TENANCY_FILE_PART_PAID.receipts[0]!;

  it("labels the total as not paid in full, never 'Paid in total'", async () => {
    const runs = await pack(TENANCY_FILE_PART_PAID);
    expect(after(runs, NOT_PAID_IN_FULL)).toBe(TOTAL);
    expect(runs).not.toContain(PAID_IN_TOTAL);
  });

  it("lists the one payment that settled, with its amount and date, and no reference it does not have", async () => {
    const runs = await pack(TENANCY_FILE_PART_PAID);
    expect(after(runs, "Payments")).toBe(`${PART.amount} on ${PART.date}`);
    expect(runs).not.toContain(NO_PAYMENT);
    expect(runs.filter((run) => run.startsWith("Reference "))).toEqual([]);
  });

  it("does not tell the tenant to make a receipt code they cannot make until the move-in is paid in full", async () => {
    const runs = await pack(TENANCY_FILE_PART_PAID);
    expect(RECEIPT_CODE_AFTER_FULL_PAYMENT).toBe(
      "A receipt code can be made in the tenancy file once the move-in is paid in full.",
    );
    expect(runs.filter((run) => /receipt code/i.test(run))).toEqual([RECEIPT_CODE_AFTER_FULL_PAYMENT]);
  });
});

describe("the complaint pack's money statements, fully paid", () => {
  const WHOLE = TENANCY_FILE_PAID.receipts[0]!;

  it("labels the total 'Paid in total'", async () => {
    const runs = await pack(TENANCY_FILE_PAID);
    expect(after(runs, PAID_IN_TOTAL)).toBe(TOTAL);
    expect(runs).not.toContain(NOT_PAID_IN_FULL);
  });

  it("lists the payment of the whole total", async () => {
    const runs = await pack(TENANCY_FILE_PAID);
    expect(after(runs, "Payments")).toBe(`${TOTAL} on ${WHOLE.date}`);
    expect(runs).not.toContain(NO_PAYMENT);
  });

  it("offers the receipt code the tenancy file now makes (no code made yet: no fixture holds a hint)", async () => {
    const runs = await pack(TENANCY_FILE_PAID);
    expect(runs.filter((run) => /receipt code/i.test(run))).toEqual([MAKE_A_CODE]);
  });
});

describe("the complaint pack's money statements, paid then void (cancelled, refunded or reversed)", () => {
  const WHOLE = TENANCY_FILE_PAID_THEN_VOID.receipts[0]!;

  it("labels the total the move-in total, never 'Paid in total' nor 'not paid in full', and says the charge is void", async () => {
    const runs = await pack(TENANCY_FILE_PAID_THEN_VOID);
    expect(after(runs, "Move-in total")).toBe(TOTAL);
    expect(runs).not.toContain(PAID_IN_TOTAL);
    expect(runs).not.toContain(NOT_PAID_IN_FULL);
    expect(TENANCY_VOID_STATEMENT).toBe("This move-in was cancelled, refunded or reversed, so nothing is owed on it.");
    expect(after(runs, TOTAL)).toBe(TENANCY_VOID_STATEMENT);
  });

  it("still lists the payment that settled: it happened", async () => {
    const runs = await pack(TENANCY_FILE_PAID_THEN_VOID);
    expect(after(runs, "Payments")).toBe(`${TOTAL} on ${WHOLE.date}`);
  });

  it("says no receipt code can be made or checked, never 'make one' or 'one is working'", async () => {
    const runs = await pack(TENANCY_FILE_PAID_THEN_VOID);
    expect(RECEIPT_CODE_VOID).toBe(
      "A receipt code cannot be made or checked for a move-in that was cancelled, refunded or reversed.",
    );
    expect(runs.filter((run) => /receipt code/i.test(run))).toEqual([RECEIPT_CODE_VOID]);
  });

  it("says no caution is owed, the tenancy file's own sentence, and opens no demand letter", async () => {
    const runs = await pack(TENANCY_FILE_PAID_THEN_VOID);
    expect(after(runs, "The caution")).toBe("This tenancy was cancelled or refunded, so no caution is owed on it.");
    expect(runs).not.toContain("Caution demand letter");
  });
});

describe("the complaint pack's parties sentence", () => {
  for (const [state, file] of [
    ["unpaid", TENANCY_FILE_UNPAID],
    ["part-paid", TENANCY_FILE_PART_PAID],
    ["paid", TENANCY_FILE_PAID],
    ["paid then void", TENANCY_FILE_PAID_THEN_VOID],
  ] as const) {
    it(`${state}: an unnamed lister gets its own sentence, never "the lister, lister."`, async () => {
      const runs = await pack(file);
      expect(runs).toContain(`${TENANT}, tenant. The lister is not named on the record.`);
      expect(runs.join("\n")).not.toMatch(/lister, lister/i);
    });

    it(`${state}: a named lister is named once, by first name and initial`, async () => {
      expect(NAMED_LISTER).toBe("Tunde A.");
      const runs = await pack(withLister(file));
      expect(runs).toContain(`${TENANT}, tenant. ${NAMED_LISTER}, lister.`);
    });
  }
});
