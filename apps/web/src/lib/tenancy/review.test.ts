import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { tenancyReviewOpen, tenancyReviewRow, tenancyReviewSchema } from "./review";
import { doorHonestyLine } from "./door";

const PAYMENT = "11111111-1111-4111-8111-111111111111";
const base = {
  paymentId: PAYMENT,
  paidExtra: "no" as const,
  asListed: "yes" as const,
  agentOnTime: "yes" as const,
  again: "yes" as const,
  rating: 4,
};

describe("the tenancy review (V-59)", () => {
  it("accepts the door first, and how much and to whom only with a yes", () => {
    expect(tenancyReviewSchema.safeParse(base).success).toBe(true);
    expect(tenancyReviewSchema.safeParse({ ...base, paidExtra: "yes", extraNaira: 50_000, extraTo: "caretaker" }).success).toBe(true);
    expect(tenancyReviewSchema.safeParse({ ...base, extraNaira: 50_000 }).success).toBe(false);
    expect(tenancyReviewSchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
  });

  it("stores kobo from naira by multiplication, and nothing extra on a no", () => {
    const yes = tenancyReviewRow({ ...base, paidExtra: "yes", extraNaira: 50_000, extraTo: "caretaker" }, "u");
    expect(yes.extra_minor).toBe(5_000_000);
    expect(yes.extra_to).toBe("caretaker");
    const no = tenancyReviewRow(base, "u");
    expect(no.extra_minor).toBeNull();
    expect(no.extra_to).toBeNull();
  });

  it("opens a month after move-in on a paid charge, the policy's own rule", () => {
    expect(tenancyReviewOpen({ bookingStatus: "CONFIRMED", moveIn: "2026-08-01", today: "2026-08-31" })).toBe(true);
    expect(tenancyReviewOpen({ bookingStatus: "CONFIRMED", moveIn: "2026-08-01", today: "2026-08-30" })).toBe(false);
    expect(tenancyReviewOpen({ bookingStatus: "PENDING", moveIn: "2026-08-01", today: "2026-10-01" })).toBe(false);
  });

  it("publishes N of M once five tenants have answered, and nothing below", () => {
    const copy = getDictionary("en").trustVisible.tenancy;
    expect(doorHonestyLine({ nothingMore: 9, answered: 10 }, copy)).toBe(
      "Moved in for the Vallo price: 9 of 10 tenants said nothing more was asked at the door.",
    );
    expect(doorHonestyLine({ nothingMore: 0, answered: 5 }, copy)).toContain("0 of 5 tenants");
    expect(doorHonestyLine({ nothingMore: 4, answered: 4 }, copy)).toBeNull();
    expect(doorHonestyLine({ nothingMore: 6, answered: 5 }, copy)).toBeNull();
    expect(doorHonestyLine(null, copy)).toBeNull();
  });

  it("is reachable from the inspection card and shown on the listing page", () => {
    const root = join(__dirname, "..", "..");
    const page = readFileSync(join(root, "app/(app)/inspections/page.tsx"), "utf8");
    expect(page.match(/tenancyReview=\{tenancyFor\(row\)\}/g)?.length).toBe(2);
    const listing = readFileSync(join(root, "app/(app)/listing/[id]/page.tsx"), "utf8");
    expect(listing).toContain('data-testid="door-honesty"');
  });
});
