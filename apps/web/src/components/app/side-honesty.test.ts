import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isDetailPath, sideOfPath } from "@/lib/side.constants";

/**
 * UX-04 / UX-06: the side never turns over silently. A detail page paints its
 * own side but does not move the stored preference; the header names the side
 * the app is on; the ⇄ sheet offers the side switch first.
 */
const src = (p: string) => readFileSync(join(process.cwd(), "src", p), "utf8");

describe("the side is only moved on purpose", () => {
  it("knows a detail page from a side's root", () => {
    for (const path of ["/stay/abc", "/restaurant/abc", "/listing/abc", "/stay/abc/"]) {
      expect(isDetailPath(path), path).toBe(true);
    }
    for (const path of ["/stays", "/stays/search", "/restaurants", "/trips", "/home", "/settings", "/stay"]) {
      expect(isDetailPath(path), path).toBe(false);
    }
    /* The URL still paints the side: a stay is drawn in the Stays shell. */
    expect(sideOfPath("/stay/abc")).toBe("stays");
    /* A checkout is drawn on the side of what is paid for (always a stay),
       and does not move the saved preference either. */
    expect(sideOfPath("/checkout")).toBe("stays");
    expect(sideOfPath("/checkout/b1")).toBe("stays");
    expect(isDetailPath("/checkout")).toBe(true);
    expect(isDetailPath("/checkout/b1")).toBe(true);
    expect(sideOfPath("/rent/pay/i1")).toBe("property");
  });

  it("does not write the cookie from a detail page", () => {
    const sync = src("components/app/SideSync.tsx");
    expect(sync).toContain("if (persist && readSideCookie() !== side) writeSideCookie(side);");
    expect(src("components/app/AppShell.tsx")).toContain(
      "<SideSync side={effectiveSide} persist={!isDetailPath(active)} />",
    );
  });

  it("names the side in the header, as text a screen reader hears in full", () => {
    const shell = src("components/app/AppShell.tsx");
    expect(shell).toContain('className="nf-side-tag lg:hidden"');
    expect(shell).toContain("{t.side.indicatorPrefix} </span>");
    expect(shell).toMatch(/effectiveSide === "stays" \? t\.side\.staysName : t\.side\.propertyName/);
    expect(src("app/css/chrome.css")).toMatch(/\.nf-side-tag \{[^}]*font-size: var\(--nf-text-caption\)/);
  });

  it("offers the side switch at the top of the ⇄ sheet", () => {
    const switcher = src("components/supply/ProfileSwitcher.tsx");
    const flipAt = switcher.indexOf('data-testid="switcher-side-flip"');
    expect(flipAt).toBeGreaterThan(-1);
    expect(flipAt).toBeLessThan(switcher.indexOf("onClick={choosePersonal}"));
    expect(switcher).toContain("flipApi.flip(otherSide(side))");
  });

  it("keeps stays off the Property home and yearly lets off the Stays home", () => {
    expect(src("app/(app)/home/page.tsx")).toContain("isPropertyMarket(marketOf(listing))");
    expect(src("app/(app)/stays/page.tsx")).toContain('marketOf(listing) === "stay"');
  });
});
