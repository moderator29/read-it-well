import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { readRecordCode, recordFrom, recordLines, replyBand } from "./record";

const copy = getDictionary("en").trustVisible.record;

const FULL = {
  record_code: "VR-MA2NKB",
  display_name: "Chidi Okeke",
  since: "2026-03-02T10:00:00Z",
  stopped_at: null,
  reply_median_minutes: 95,
  replied: 48,
  answered_in_day: 47,
  enquiries: 51,
  described: 27,
  described_of: 29,
  lets: 9,
  kept: 29,
  kept_of: 31,
};

describe("the Vallo Record (V-34)", () => {
  it("prints every counted line, in order, each with its own count and window", () => {
    expect(recordLines(recordFrom(FULL), copy, "en").map((l) => l.text)).toEqual([
      "Replies usually within 2 hours (48 enquiries, last 90 days)",
      "Enquiries answered within a day: 47 of 51, last 90 days",
      "Inspections kept: 29 of 31, counted from the code at the gate, last 12 months",
      "Found as described at inspection: 27 of 29 renters, last 12 months",
      "Let through Vallo: 9 in the last 12 months",
      "On Vallo since March 2026",
    ]);
  });

  it("reads the RPC's array answer as well as a single row, and no row as null", () => {
    expect(recordFrom([FULL])?.recordCode).toBe("VR-MA2NKB");
    expect(recordFrom([])).toBeNull();
    expect(recordFrom(null)).toBeNull();
    expect(recordLines(null, copy, "en")).toEqual([]);
  });

  it("prints nothing for a null count, and never below five even if one leaks through", () => {
    const lines = recordLines(
      recordFrom({ ...FULL, enquiries: 4, answered_in_day: 4, described: null, described_of: null, lets: 3, replied: 4, kept: 3, kept_of: 4 }),
      copy,
      "en",
    );
    expect(lines.map((l) => l.key)).toEqual(["since"]);
  });

  it("never prints a numerator bigger than its denominator", () => {
    const lines = recordLines(recordFrom({ ...FULL, described: 30, described_of: 29 }), copy, "en");
    expect(lines.map((l) => l.key)).not.toContain("described");
  });

  it("shows a stopped lister's stop and nothing else", () => {
    const lines = recordLines(recordFrom({ ...FULL, stopped_at: "2026-10-04T09:00:00Z" }), copy, "en");
    expect(lines).toEqual([{ key: "stopped", text: "Stopped by Vallo on 4 October 2026" }]);
  });

  it("bands the median reply and prints nothing past three days", () => {
    expect(replyBand(30)).toBe("hour");
    expect(replyBand(60)).toBe("hour");
    expect(replyBand(61)).toBe("twoHours");
    expect(replyBand(300)).toBe("fewHours");
    expect(replyBand(1440)).toBe("day");
    expect(replyBand(4000)).toBe("threeDays");
    expect(replyBand(5000)).toBeNull();
    expect(replyBand(null)).toBeNull();
    expect(replyBand(-1)).toBeNull();
  });

  it("has no line that combines two facts into one number", () => {
    const src = readFileSync(join(__dirname, "record.ts"), "utf8");
    const exported = [...src.matchAll(/export (?:function|const) (\w+)/g)].map((m) => m[1]);
    expect(exported.filter((name) => /score|total|combine|overall/i.test(name ?? ""))).toEqual([]);
    expect(Object.keys(copy)).not.toContain("score");
  });
});

describe("reading a Record code someone typed", () => {
  it("accepts VR codes in any case and spacing", () => {
    expect(readRecordCode("vr-ma2nkb")).toBe("VR-MA2NKB");
    expect(readRecordCode(" VR MA2 NKB ")).toBe("VR-MA2NKB");
  });

  it("refuses a listing code, six bare characters, and characters never minted", () => {
    expect(readRecordCode("VL-MA2NKB")).toBeNull();
    expect(readRecordCode("MA2NKB")).toBeNull();
    expect(readRecordCode("VR-MA2NK1")).toBeNull();
    expect(readRecordCode("VR-OUILAB")).toBeNull();
    expect(readRecordCode("Ibadan")).toBeNull();
  });
});

describe("where the Record is drawn", () => {
  const root = join(__dirname, "..", "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");

  it("sits under the listing's agent card, on the supplier page and in the thread header", () => {
    expect(read("app/(app)/listing/[id]/page.tsx")).toContain("<ValloRecord record={record}");
    expect(read("app/(app)/listing/[id]/page.tsx")).toContain("listing.isDemo ? null : await readListingRecord(listing.id)");
    expect(read("app/(app)/u/[handle]/page.tsx")).toContain("readUserRecord(userId)");
    expect(read("app/(app)/messages/[id]/page.tsx")).toContain("await readThreadRecord(id)");
    expect(read("app/(app)/messages/[id]/ThreadView.tsx")).toContain('data-testid="thread-record"');
  });

  it("sends a typed VR code from search to its own page, and only with the prefix", () => {
    const search = read("app/(app)/search/page.tsx");
    expect(search).toContain("if (recordCode) redirect(`/record/${recordCode}`);");
    expect(read("lib/nav/route-parents.ts")).toContain('"/record/[code]": "/search"');
  });
});
