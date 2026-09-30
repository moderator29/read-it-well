import { describe, expect, it } from "vitest";
import { dayOfViewing, icsEscape, icsFileName, LATE_OPTIONS, lateMessage, viewingAhead, viewingIcs } from "./day-kit";

const SLOT = "2026-10-14T09:00:00.000Z"; // 10:00 in Lagos

describe("viewing day kit (B5)", () => {
  it("builds a calendar entry with the area only, a link back and a 90 minute alarm", () => {
    const ics = viewingIcs({
      inspectionId: "abc",
      slotAt: SLOT,
      title: "Viewing: Yaba",
      location: "Yaba, Lagos",
      url: "https://vallospaces.com/bookings?kind=inspection#ix-abc",
      alarm: "Viewing in 90 minutes",
      now: Date.parse("2026-10-01T00:00:00Z"),
    })!;
    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("DTSTART:20261014T090000Z");
    expect(ics).toContain("DTEND:20261014T100000Z");
    expect(ics).toContain("SUMMARY:Viewing: Yaba");
    expect(ics).toContain("LOCATION:Yaba\\, Lagos");
    expect(ics).toContain("TRIGGER:-PT90M");
    expect(ics).toContain("UID:viewing-abc@vallo");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    for (const line of ics.split("\r\n")) expect(line.length).toBeLessThanOrEqual(75);
  });

  it("refuses a slot it cannot read", () => {
    expect(viewingIcs({ inspectionId: "x", slotAt: "nope", title: "t", location: "l", url: "u", alarm: "a" })).toBeNull();
  });

  it("escapes calendar text", () => {
    expect(icsEscape("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
  });

  it("shows the Day of strip on the Lagos day until three hours after", () => {
    expect(dayOfViewing(SLOT, Date.parse("2026-10-13T23:30:00Z"))).toBe(true); // 00:30 Lagos, same day
    expect(dayOfViewing(SLOT, Date.parse("2026-10-13T22:30:00Z"))).toBe(false); // 23:30 Lagos the day before
    expect(dayOfViewing(SLOT, Date.parse("2026-10-14T11:59:00Z"))).toBe(true);
    expect(dayOfViewing(SLOT, Date.parse("2026-10-14T12:01:00Z"))).toBe(false);
    expect(dayOfViewing(null, Date.now())).toBe(false);
  });

  it("offers the calendar only while the viewing is ahead", () => {
    expect(viewingAhead(SLOT, Date.parse("2026-10-01T00:00:00Z"))).toBe(true);
    expect(viewingAhead(SLOT, Date.parse("2026-10-15T00:00:00Z"))).toBe(false);
  });

  it("asks 15, 30 or 60 minutes and nothing else", () => {
    expect(LATE_OPTIONS).toEqual([15, 30, 60]);
    expect(lateMessage(30, "Running about {minutes} minutes late.")).toBe("Running about 30 minutes late.");
  });

  it("names the download from the area", () => {
    expect(icsFileName("Lekki Phase 1")).toBe("vallo-viewing-lekki-phase-1.ics");
    expect(icsFileName("")).toBe("vallo-viewing.ics");
  });
});
