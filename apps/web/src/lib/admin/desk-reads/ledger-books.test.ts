import { beforeEach, describe, expect, it, vi } from "vitest";

const seam = vi.hoisted(() => ({
  access: { state: "admin" } as Record<string, unknown>,
  result: { data: null as unknown, error: null as unknown },
  scope: undefined as string | undefined,
  usedServiceClient: false,
}));

vi.mock("../guard", () => ({
  requireAdmin: async (scope?: string) => {
    seam.scope = scope;
    return seam.access;
  },
}));
vi.mock("../../supabase/admin", () => ({
  createAdminClient: () => {
    seam.usedServiceClient = true;
    return { from: () => ({ select: async () => seam.result }) };
  },
}));

const { shapeLedgerBooks } = await import("./ledger-books-shape");
const { readLedgerBooks } = await import("./ledger-books");

beforeEach(() => {
  seam.access = { state: "admin" };
  seam.result = { data: [], error: null };
  seam.usedServiceClient = false;
});

describe("shapeLedgerBooks", () => {
  it("orders the books as the schema names them and sums entries per book", () => {
    const books = shapeLedgerBooks([
      { pot: "marketing_float", currency: "NGN", balance_minor: 500, entries: 1 },
      { pot: "customer_funds", currency: "NGN", balance_minor: "12000", entries: "4" },
      { pot: "customer_funds", currency: "USD", balance_minor: 100, entries: 2 },
    ]);
    expect(books.map((b) => b.pot)).toEqual(["customer_funds", "marketing_float"]);
    expect(books[0]).toMatchObject({ entries: 6, lines: [{ currency: "NGN", balanceMinor: 12000, entries: 4 }, { currency: "USD", balanceMinor: 100, entries: 2 }] });
  });

  it("leaves a book with no confirmed entry out, and skips a row it cannot read", () => {
    expect(shapeLedgerBooks([])).toEqual([]);
    expect(shapeLedgerBooks([{ pot: "vallo_revenue", currency: "NGN", balance_minor: "x", entries: 1 }])).toEqual([]);
    expect(shapeLedgerBooks([{ pot: "unknown_book", currency: "NGN", balance_minor: 1, entries: 1 }])).toEqual([]);
  });
});

describe("readLedgerBooks", () => {
  it("behind the finance door, reads the service-role view on the server", async () => {
    seam.result = { data: [{ pot: "vallo_revenue", currency: "NGN", balance_minor: 700, entries: 2 }], error: null };
    const read = await readLedgerBooks();
    expect(seam.scope).toBe("finance");
    expect(seam.usedServiceClient).toBe(true);
    expect(read).toEqual({ state: "ok", books: [{ pot: "vallo_revenue", entries: 2, lines: [{ currency: "NGN", balanceMinor: 700, entries: 2 }] }] });
  });

  it("never touches the view for somebody the door refuses", async () => {
    seam.access = { state: "not-admin" };
    expect(await readLedgerBooks()).toEqual({ state: "forbidden" });
    expect(seam.usedServiceClient).toBe(false);
  });

  it("is unavailable, not an empty book, when the view cannot be read", async () => {
    seam.result = { data: null, error: { code: "42501" } };
    expect(await readLedgerBooks()).toEqual({ state: "unavailable" });
  });
});
