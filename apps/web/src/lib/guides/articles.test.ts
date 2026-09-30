import { describe, expect, it } from "vitest";
import { unbackedClaim } from "@/lib/trust/claims";
import { GUIDES, guideBySlug, readingMinutes } from "./articles";
import { GUIDE_SLUGS } from "./slugs";

const EVERY_TEXT = (slug: string) => {
  const guide = guideBySlug(slug);
  if (!guide) return [];
  return [
    guide.title,
    guide.description,
    ...guide.sections.flatMap((s) => [s.title, ...s.blocks.flatMap((b) => (typeof b === "string" ? [b] : b.list))]),
  ];
};

describe("A14 guides", () => {
  it("publishes exactly the slugs the sitemap names, once each", () => {
    expect(GUIDES.map((g) => g.slug).sort()).toEqual([...GUIDE_SLUGS].sort());
  });

  it("carries a review date and a reading time on every guide", () => {
    for (const guide of GUIDES) {
      expect(guide.reviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(readingMinutes(guide)).toBeGreaterThanOrEqual(1);
      expect(guide.sections.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("prints no unbacked claim, no em dash and no invented statistic", () => {
    for (const slug of GUIDE_SLUGS) {
      for (const text of EVERY_TEXT(slug)) {
        expect(unbackedClaim(text), `${slug}: ${text}`).toBeNull();
        expect(text).not.toContain("—");
        /* A percentage may appear only as the cited rule's maximum. */
        const percents = text.match(/\d+(\.\d+)?%/g) ?? [];
        if (percents.length > 0) expect(text, `${slug}: a percent outside the cited rule`).toMatch(/Tenancy Law/);
      }
    }
  });

  it("sends every guide somewhere real and public", () => {
    for (const guide of GUIDES) expect(guide.next.href.startsWith("/")).toBe(true);
  });
});
