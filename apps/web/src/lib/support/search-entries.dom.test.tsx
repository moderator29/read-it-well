import { describe, expect, it } from "vitest";
import { buildSupportEntries } from "./search-entries";
import { search } from "./search";

const entries = buildSupportEntries();

describe("the unified support index", () => {
  it("holds every section: help, docs, guides and legal", () => {
    const sections = new Set(entries.map((e) => e.section));
    expect([...sections].sort()).toEqual(["docs", "guides", "help", "legal"]);
  });

  it("has unique ids and a route for every entry", () => {
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
    for (const entry of entries) expect(entry.href.startsWith("/")).toBe(true);
  });

  it("reads the words of a docs section, not just its heading", () => {
    const viewings = entries.find((e) => e.id === "docs-viewings-reminders");
    expect(viewings?.text).toContain("19:00");
  });

  it("answers 'is Vallo free' from Help first", () => {
    const hits = search(entries, "is Vallo free");
    expect(hits[0]?.entry.section).toBe("help");
    expect(hits[0]?.entry.title).toBe("Is Vallo free to use?");
  });

  it("answers 'how do I cancel a booking' with Help and Docs", () => {
    const hits = search(entries, "how do I cancel a booking");
    expect(hits[0]?.entry.title).toBe("How do I cancel a booking?");
    expect(hits.some((h) => h.entry.section === "docs")).toBe(true);
  });

  it("finds a legal page heading", () => {
    const hits = search(entries, "cookies");
    expect(hits.some((h) => h.entry.section === "legal" && h.entry.href.startsWith("/privacy"))).toBe(true);
  });

  it("finds a guide", () => {
    const hits = search(entries, "rental scams");
    expect(hits.some((h) => h.entry.section === "guides")).toBe(true);
  });

  it("finds the viewing and badge chapters for plain questions", () => {
    expect(search(entries, "book a viewing").some((h) => h.entry.href.startsWith("/docs/viewings"))).toBe(true);
    expect(search(entries, "what does a badge mean").some((h) => h.entry.href.startsWith("/docs/badges-and-verification"))).toBe(true);
  });
});
