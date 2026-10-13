import { describe, expect, it, vi } from "vitest";
import { getDictionary } from "@vallo/i18n";

import {
  GUEST_RECORD_BATCH,
  guestRecordLine,
  parseGuestRecords,
  readGuestRecords,
  type GuestRecordWords,
} from "./guest-record";

/**
 * RESTAURANT-06: the venue's one quiet line about a diner's past tables.
 * Counts only, last 12 months, nothing for a first-time diner, and a failed
 * read shows nothing rather than a guess.
 */

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

const EN: GuestRecordWords = getDictionary("en").tableDesk.record;

function clientAnswering(answer: { data: unknown; error: unknown } | Error) {
  const rpc = vi.fn(() => (answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer)));
  return { client: { rpc }, rpc };
}

describe("parseGuestRecords", () => {
  it("keys each row by its reservation and keeps both counts", () => {
    const map = parseGuestRecords([
      { reservation_id: A, kept: 4, missed: 1 },
      { reservation_id: B, kept: "2", missed: "0" },
    ]);
    expect(map.get(A)).toEqual({ kept: 4, missed: 1 });
    expect(map.get(B)).toEqual({ kept: 2, missed: 0 });
  });

  it("drops a first-time diner, so the card says nothing about them", () => {
    expect(parseGuestRecords([{ reservation_id: A, kept: 0, missed: 0 }]).size).toBe(0);
  });

  it("drops rows that are not rows rather than guessing a count", () => {
    const map = parseGuestRecords([
      null,
      "row",
      { reservation_id: "not-a-uuid", kept: 1, missed: 0 },
      { reservation_id: A, kept: -1, missed: 0 },
      { reservation_id: B, kept: 1.5, missed: 0 },
      { reservation_id: C, kept: 1 },
    ]);
    expect(map.size).toBe(0);
  });

  it("reads anything that is not a list as no records", () => {
    expect(parseGuestRecords(null).size).toBe(0);
    expect(parseGuestRecords({ reservation_id: A, kept: 1, missed: 1 }).size).toBe(0);
  });
});

describe("readGuestRecords", () => {
  it("asks once, for the valid ids only, without duplicates", async () => {
    const { client, rpc } = clientAnswering({ data: [{ reservation_id: A, kept: 3, missed: 0 }], error: null });
    const map = await readGuestRecords(client, [A, A, "nope", B]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("reservation_guest_records", { p_reservations: [A, B] });
    expect(map.get(A)).toEqual({ kept: 3, missed: 0 });
    expect(map.has(B)).toBe(false);
  });

  it("never sends more than the database accepts in one call", async () => {
    const { client, rpc } = clientAnswering({ data: [], error: null });
    const ids = Array.from({ length: GUEST_RECORD_BATCH + 20 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    await readGuestRecords(client, ids);
    const args = (rpc.mock.calls[0] as unknown as [string, { p_reservations: string[] }])[1];
    expect(args.p_reservations).toHaveLength(GUEST_RECORD_BATCH);
  });

  it("does not call the database when there is nothing to ask about", async () => {
    const { client, rpc } = clientAnswering({ data: [], error: null });
    expect((await readGuestRecords(client, [])).size).toBe(0);
    expect((await readGuestRecords(client, ["x"])).size).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("shows nothing when the read fails, and reports the failure", async () => {
    const report = vi.fn();
    const { client } = clientAnswering({ data: null, error: { code: "PGRST202", message: "not found" } });
    expect((await readGuestRecords(client, [A], report)).size).toBe(0);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("shows nothing when the call throws", async () => {
    const report = vi.fn();
    const { client } = clientAnswering(new Error("network"));
    expect((await readGuestRecords(client, [A], report)).size).toBe(0);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("treats an empty answer as no records, not as an error", async () => {
    const report = vi.fn();
    const { client } = clientAnswering({ data: [], error: null });
    expect((await readGuestRecords(client, [A], report)).size).toBe(0);
    expect(report).not.toHaveBeenCalled();
  });
});

describe("guestRecordLine", () => {
  it("says both counts, plural through the dictionary", () => {
    expect(guestRecordLine({ kept: 4, missed: 1 }, EN, "en")).toBe("Kept 4 tables, missed 1 table, last 12 months");
  });

  it("names only what happened", () => {
    expect(guestRecordLine({ kept: 1, missed: 0 }, EN, "en")).toBe("Kept 1 table, last 12 months");
    expect(guestRecordLine({ kept: 0, missed: 2 }, EN, "en")).toBe("Missed 2 tables, last 12 months");
  });

  it("says nothing for a first-time diner or a missing record", () => {
    expect(guestRecordLine({ kept: 0, missed: 0 }, EN, "en")).toBeNull();
    expect(guestRecordLine(null, EN, "en")).toBeNull();
    expect(guestRecordLine(undefined, EN, "en")).toBeNull();
  });

  it("never leaves a placeholder behind in any language", () => {
    for (const locale of ["en", "yo", "ha", "ig"] as const) {
      const words = getDictionary(locale).tableDesk.record;
      for (const record of [{ kept: 1, missed: 1 }, { kept: 3, missed: 0 }, { kept: 0, missed: 2 }]) {
        const line = guestRecordLine(record, words, locale);
        expect(line).toBeTruthy();
        expect(line).not.toMatch(/\{(kept|missed|count)\}/);
      }
    }
  });
});
