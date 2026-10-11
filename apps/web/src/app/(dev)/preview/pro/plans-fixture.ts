import type { PaidPlan } from "@/app/(app)/pro/pro-state";

/**
 * The two plans exactly as migration d84 seeds them (D83, the founder's
 * rulings of 8 October), so the preview harnesses draw what a member would
 * see once it is applied. Development previews only; the real page reads the
 * rows.
 */
export const PREVIEW_PLANS: PaidPlan[] = [
  {
    key: "pro",
    name: "Vallo Pro",
    priceMinor: 950_000,
    interval: "month",
    quotas: [{ key: "listing_boost", count: 4 }],
    perks: ["deep_analytics", "pro_badge", "priority_support"],
  },
  {
    key: "business",
    name: "Vallo Business",
    priceMinor: 3_500_000,
    interval: "month",
    quotas: [
      { key: "listing_spotlight", count: 2 },
      { key: "listing_featured", count: 1 },
    ],
    perks: ["team_members", "command_centre", "bulk_tools", "export"],
  },
];

/** The trial length d84 seeds (the founder's decision of 8 October). */
export const PREVIEW_TRIAL_DAYS = 4;
