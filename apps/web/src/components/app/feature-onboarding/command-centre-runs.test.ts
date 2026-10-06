import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { FIRST_RUN_HOME, canMount, firstRunContent, isMountedFirstRun } from "./first-runs";

/**
 * R3-12: THE OWNER AND TENANT COMMAND CENTRES' FIRST RUNS, AS THE TWO
 * SURFACES THAT DO THAT JOB TODAY.
 *
 * North star 14.1 asks this first run to make clear "what this surface is
 * for". There is no route called a command centre; the tenant's is the
 * tenancy file and the owner's is their buildings. These tests hold the two
 * first runs to what those pages actually say, so a first run cannot teach a
 * surface that does not exist.
 *
 * Promotion has no first run, on purpose: there is no promotion product to
 * teach (paid placement was removed in v06, and Session 2's entitlements and
 * promotion, R3-30, have not landed). A first run for it would be invented.
 */
const t = getDictionary("en");

describe("the tenant's first run, on the tenancy file", () => {
  const content = firstRunContent("tenancy", t);

  it("is mounted and keeps the grammar", () => {
    expect(isMountedFirstRun("tenancy")).toBe(true);
    expect(canMount(content)).toBe(true);
    expect(content.panels).toHaveLength(3);
  });

  it("places the tenancy file's own published sentences rather than new ones", () => {
    expect(content.panels[0]?.body).toBe(t.afterTheGate.tenancy.lede);
    expect(content.panels[1]?.body).toBe(t.afterTheGate.tenancy.cautionNotHeld);
  });

  it("falls back to where tenancies are listed, the tenancy file's own declared parent", () => {
    expect(FIRST_RUN_HOME.tenancy).toBe("/bookings");
  });
});

describe("the owner's first run, on their buildings", () => {
  const content = firstRunContent("portfolio", t);
  const text = JSON.stringify(content).toLowerCase();

  it("is mounted, keeps the grammar and hands the owner to their buildings", () => {
    expect(isMountedFirstRun("portfolio")).toBe(true);
    expect(canMount(content)).toBe(true);
    expect(FIRST_RUN_HOME.portfolio).toBe("/agent/portfolio");
  });

  it("says agents never see the address, as the invitation itself does", () => {
    expect(text).toContain("never the address");
    expect(t.landlord.portfolio.inviteLede.toLowerCase()).toContain("never the address");
  });

  it("promises nothing the buildings page cannot show", () => {
    for (const word of ["rent collect", "expenses", "maintenance", "occupancy rate", "guarantee", "wallet"]) {
      expect(text, word).not.toContain(word);
    }
  });
});

describe("promotion", () => {
  it("has no first run while there is no promotion to teach", () => {
    expect(isMountedFirstRun("promotion")).toBe(false);
  });
});
