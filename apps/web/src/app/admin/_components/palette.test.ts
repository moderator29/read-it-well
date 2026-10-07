import { describe, expect, it } from "vitest";
import { CONSOLE_JUMPS } from "@/components/app/desk/desk-keys";
import { deskIndex, paletteActions, rankDesks, searchBase } from "./palette";

const WORDS = {
  searchDesk: "Search {desk} for “{query}”",
  searchPeople: "Search people for “{query}”",
  searchQueue: "Search the unified queue for “{query}”",
  lookup: "Look up “{query}” as a reference",
};

const index = deskIndex({
  ledes: { listings: "Review each listing before it goes live in search.", money: "The Guarantee reserve, cautions and refunds." },
  counts: { listings: 4, tickets: 11 },
  jumps: CONSOLE_JUMPS,
});

describe("the console search's desk index", () => {
  it("lists every desk on the rail map, and the ones the rail does not carry", () => {
    const hrefs = new Set(index.map((d) => d.href));
    for (const href of ["/admin", "/admin/listings", "/admin/money", "/admin/people", "/admin/lookup", "/admin/account-recovery", "/admin/bookings/reservations"]) {
      expect(hrefs.has(href), href).toBe(true);
    }
  });

  it("carries the rail's own waiting counts and nothing else", () => {
    expect(index.find((d) => d.key === "listings")?.count).toBe(4);
    expect(index.find((d) => d.key === "tickets")?.count).toBe(11);
    expect(index.find((d) => d.key === "money")?.count).toBe(0);
  });

  it("knows the g-then-letter shortcut of a desk that has one", () => {
    expect(index.find((d) => d.key === "queue")?.jump).toBe("q");
    expect(index.find((d) => d.key === "money")?.jump).toBeNull();
  });
});

describe("ranking desks for what was typed", () => {
  it("leads with the desks that have work waiting when nothing is typed", () => {
    const top = rankDesks(index, "");
    expect(top[0]?.key).toBe("tickets");
    expect(top[1]?.key).toBe("listings");
  });

  it("puts a name that starts with the text before a name that merely contains it", () => {
    const keys = rankDesks(index, "pay").map((d) => d.key);
    expect(keys[0]).toBe("payments");
  });

  it("finds a desk by what it is for, after the names", () => {
    const keys = rankDesks(index, "guarantee").map((d) => d.key);
    expect(keys).toContain("money");
  });

  it("is not thrown by case or accents", () => {
    expect(rankDesks(index, "LISTINGS")[0]?.key).toBe("listings");
    expect(rankDesks(index, "  verification ")[0]?.key).toBe("kyc");
  });

  it("offers an address once, however many rows open it", () => {
    const hrefs = rankDesks(index, "moderation").map((d) => d.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("the searches under the desks", () => {
  it("offers nothing for an empty box", () => {
    expect(paletteActions("  ", "/admin", WORDS, null)).toEqual([]);
  });

  it("leads with the lookup for a pasted reference", () => {
    const actions = paletteActions("VAL-SUP-1042", "/admin/support", WORDS, "Support");
    expect(actions[0]).toMatchObject({ id: "lookup", href: "/admin/lookup?q=VAL-SUP-1042" });
  });

  it("offers the open desk's own search, then people, then the queue, for a word", () => {
    const actions = paletteActions("adaeze", "/admin/bookings", WORDS, "Bookings");
    expect(actions.map((a) => a.id)).toEqual(["desk", "people", "queue"]);
    expect(actions[0]?.href).toBe("/admin/bookings?q=adaeze");
    expect(actions[0]?.label).toBe("Search Bookings for “adaeze”");
  });

  it("does not offer a desk search where the page has none of its own", () => {
    const actions = paletteActions("adaeze", "/admin/analytics", WORDS, "Analytics");
    expect(actions.map((a) => a.id)).toEqual(["people", "queue"]);
  });

  it("encodes what was typed", () => {
    expect(paletteActions("a&b c", "/admin", WORDS, null).at(-1)?.href).toBe("/admin/queue?q=a%26b%20c");
  });
});

describe("where a word searched here goes", () => {
  it("is the open desk's own address", () => {
    expect(searchBase("/admin/bookings")).toBe("/admin/bookings");
    expect(searchBase("/admin/listings/abc")).toBe("/admin/listings");
  });
  it("is the unified queue where the page has no search", () => {
    expect(searchBase("/admin")).toBe("/admin/queue");
    expect(searchBase("/admin/operations")).toBe("/admin/queue");
  });
});
