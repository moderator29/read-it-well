import { describe, expect, it } from "vitest";
import { ADMIN_NAV, ADMIN_PRIMARY, countFor, countLabelFor, currentDestination, isSectionActive } from "./nav";
import { ROUTE_PARENTS } from "@/lib/nav/route-parents";

/** The referral desk on the console's map, with the badge for what waits on a person. */
describe("Referrals in the admin nav", () => {
  const money = ADMIN_PRIMARY.find((d) => d.key === "money")!;
  const desk = money.children!.find((d) => d.key === "referrals")!;

  it("is a desk under Money, so the twelve rows stay twelve", () => {
    expect(desk).toMatchObject({ href: "/admin/referrals", label: "Referrals" });
    expect(ADMIN_NAV.some((d) => d.href === "/admin/referrals")).toBe(true);
    expect(isSectionActive("/admin/referrals", money)).toBe(true);
    expect(currentDestination("/admin/referrals")?.label).toBe("Referrals");
  });

  it("badges referrals and payouts waiting on a decision, on the desk and on Money", () => {
    const counts = { referrals: 3, payouts: 2, listings: 9 };
    expect(countFor(desk, counts)).toBe(5);
    expect(countFor(money, counts)).toBe(5);
    expect(countLabelFor(desk)).toBe("referrals and payouts waiting on a decision");
  });

  it("shows no badge when nothing waits", () => {
    expect(countFor(desk, { referrals: 0, payouts: 0 })).toBe(0);
    expect(countFor(desk, {})).toBe(0);
  });

  it("has a back destination", () => {
    expect(ROUTE_PARENTS["/admin/referrals"]).toBe("/admin/money");
  });
});
