import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { buildFeed, checkFeedUrl, icalDate, isFeedToken, isPrivateAddress, readFeed, runsOfNights, unfold } from "./ical";

const AIRBNB = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20261006",
  "DTSTART;VALUE=DATE:20261003",
  "UID:1418fb94e984-ab@airbnb.com",
  "SUMMARY:Reserved",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HMXXXX\\nPhone",
  "  Number (Last 4 Digits): 1234",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261010",
  "DTEND;VALUE=DATE:20261011",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20261020T140000Z",
  "DTEND:20261022T100000Z",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("reading another site's calendar", () => {
  it("turns events into the nights they hold, DTEND exclusive", () => {
    const read = readFeed(AIRBNB, { from: "2026-10-01", to: "2027-10-01" });
    expect(read).toEqual({ ok: true, nights: ["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-10"], events: 3 });
  });

  it("drops nights outside the window and cancelled events", () => {
    const read = readFeed(AIRBNB, { from: "2026-10-05", to: "2026-10-09" });
    expect(read.ok && read.nights).toEqual(["2026-10-05"]);
  });

  it("refuses something that is not a calendar", () => {
    expect(readFeed("<html>Sign in</html>", { from: "2026-01-01", to: "2027-01-01" }).ok).toBe(false);
  });

  it("unfolds continued lines", () => {
    expect(unfold("A:one\r\n two\r\nB:x")).toEqual(["A:onetwo", "B:x"]);
  });

  it("reads dates and date-times as dates", () => {
    expect(icalDate("20261003")).toBe("2026-10-03");
    expect(icalDate("20261003T140000Z")).toBe("2026-10-03");
    expect(icalDate("20261332")).toBeNull();
  });
});

describe("which links may be added", () => {
  it("accepts the sites hosts list on, and webcal links", () => {
    expect(checkFeedUrl("https://www.airbnb.com/calendar/ical/123.ics?s=abc").ok).toBe(true);
    expect(checkFeedUrl("webcal://admin.booking.com/hotel/hoteladmin/ical.html?t=x").ok).toBe(true);
  });

  it("refuses anything our server should not fetch", () => {
    expect(checkFeedUrl("http://www.airbnb.com/calendar/ical/1.ics").ok).toBe(false);
    expect(checkFeedUrl("https://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(checkFeedUrl("https://evilairbnb.com/x.ics").ok).toBe(false);
    expect(checkFeedUrl("https://airbnb.com.evil.io/x.ics").ok).toBe(false);
    expect(checkFeedUrl("https://user:pw@airbnb.com/x.ics").ok).toBe(false);
    expect(checkFeedUrl("https://airbnb.com:8443/x.ics").ok).toBe(false);
    expect(checkFeedUrl("not a link").ok).toBe(false);
  });

  it("names why by a key, and the host's dictionary says it in the words the module once spelled", () => {
    const feed = getDictionary("en").experienceHost.refusals.sync.feed;
    const said = (raw: string) => {
      const checked = checkFeedUrl(raw);
      return checked.ok ? null : feed[checked.reason];
    };
    expect(said("not a link")).toBe("That is not a link. Copy the calendar link from the other site and paste it here.");
    expect(said("http://www.airbnb.com/calendar/ical/1.ics")).toBe("The link has to start with https://.");
    expect(said("https://user:pw@airbnb.com/x.ics")).toBe("That link cannot be used. Copy the calendar export link from the other site.");
    expect(said("https://127.0.0.1/x.ics")).toBe("Use the calendar link the site gives you, not an address.");
    expect(said("https://evilairbnb.com/x.ics")).toBe(
      "We can read calendars from Airbnb, Booking.com, Vrbo, Expedia, Google and Outlook calendars, and the main channel managers. Paste the export link from one of those.",
    );
    expect(said(`https://www.airbnb.com/${"a".repeat(2001)}`)).toBe("That link is too long to be a calendar link.");
  });
});

describe("private and internal addresses (SSRF)", () => {
  it("knows the inside from the outside", () => {
    for (const inside of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "172.20.0.1", "192.168.0.1", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"]) {
      expect(isPrivateAddress(inside), inside).toBe(true);
    }
    for (const outside of ["54.230.10.10", "172.32.0.1", "2a03:2880:f10c::1", "::ffff:8.8.8.8"]) {
      expect(isPrivateAddress(outside), outside).toBe(false);
    }
  });

  it("refuses an address typed in place of a name", () => {
    expect(checkFeedUrl("https://127.0.0.1/x.ics").ok).toBe(false);
    expect(checkFeedUrl("https://[::1]/x.ics").ok).toBe(false);
  });
});

describe("writing Vallo's calendar", () => {
  const nights = [
    { date: "2026-10-03", kind: "booked" as const },
    { date: "2026-10-04", kind: "booked" as const },
    { date: "2026-10-05", kind: "closed" as const },
    { date: "2026-10-09", kind: "booked" as const },
  ];

  it("groups runs of the same kind", () => {
    expect(runsOfNights(nights)).toEqual([
      { from: "2026-10-03", to: "2026-10-04", kind: "booked" },
      { from: "2026-10-05", to: "2026-10-05", kind: "closed" },
      { from: "2026-10-09", to: "2026-10-09", kind: "booked" },
    ]);
  });

  it("writes all-day events another site can read back, with no guest details", () => {
    const text = buildFeed({ name: "Eko Rooms, Deluxe", token: "a".repeat(64), nights, now: new Date("2026-09-30T08:00:00Z") });
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text).toContain("DTSTART;VALUE=DATE:20261003\r\nDTEND;VALUE=DATE:20261005");
    expect(text).toContain("X-WR-CALNAME:Vallo: Eko Rooms\\, Deluxe");
    expect(text).not.toMatch(/guest|phone|email/i);
    const back = readFeed(text, { from: "2026-10-01", to: "2026-12-31" });
    expect(back.ok && back.nights).toEqual(["2026-10-03", "2026-10-04", "2026-10-05", "2026-10-09"]);
  });

  it("knows a token when it sees one", () => {
    expect(isFeedToken("0123456789abcdef".repeat(4))).toBe(true);
    expect(isFeedToken("../etc")).toBe(false);
  });
});
