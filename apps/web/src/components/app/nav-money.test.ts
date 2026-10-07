import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { shellDictionary } from "@/lib/i18n/shell-dictionary";
import { buildNav } from "./nav-model";

/*
 * THE MONEY GROUP HAS DOORS (7 October 2026, D70).
 *
 * Receipts, Payouts and Refunds were built, tested and reachable only by
 * typing the address, and the founder concluded they had not been built.
 * This fails if any of them, or Payments, Rewards or Invite, loses its row.
 */
const t = shellDictionary(getDictionary("en"));
const base = { t, unreadNotifications: 0, isAgent: false, isAdmin: false };
const MONEY = ["/payments", "/receipts", "/payouts", "/refunds", "/rewards", "/settings/invite"];

describe("the side navigation's money group", () => {
  for (const side of ["property", "stays"] as const) {
    it(`carries every money destination on the ${side} side, under one heading`, () => {
      const sections = buildNav({ ...base, side, signedIn: true });
      const money = sections.find((s) => s.heading === t.experienceShell.navMoneyLabel);
      expect(money?.items.map((i) => i.href)).toEqual(MONEY);
    });
  }

  it("offers none of them to a signed-out visitor", () => {
    const hrefs = buildNav({ ...base, signedIn: false }).flatMap((s) => s.items.map((i) => i.href));
    for (const href of MONEY) expect(hrefs).not.toContain(href);
  });
});
