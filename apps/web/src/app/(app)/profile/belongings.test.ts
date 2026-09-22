import { describe, expect, it } from "vitest";
import { NO_FACTS, rowValue, switchParamTarget, switchRoleLine, type BelongingsFacts } from "./belongings";
import type { RoleState } from "@/components/roles/roles";

const facts = (over: Partial<BelongingsFacts>): BelongingsFacts => ({ ...NO_FACTS, ...over });

describe("rowValue: only what the database returned", () => {
  it("draws nothing for a read that failed", () => {
    expect(rowValue("bookings", NO_FACTS, "en")).toBeNull();
    expect(rowValue("saved", NO_FACTS, "en")).toBeNull();
    expect(rowValue("wallet", NO_FACTS, "en")).toBeNull();
    expect(rowValue("inspections", NO_FACTS, "en")).toBeNull();
  });

  it("draws nothing for a zero count", () => {
    expect(rowValue("bookings", facts({ upcomingBookings: 0 }), "en")).toBeNull();
    expect(rowValue("saved", facts({ saved: 0 }), "en")).toBeNull();
    expect(rowValue("inspections", facts({ openInspections: 0 }), "en")).toBeNull();
  });

  it("words a real count", () => {
    expect(rowValue("bookings", facts({ upcomingBookings: 2 }), "en")).toBe("2 upcoming");
    expect(rowValue("saved", facts({ saved: 1400 }), "en")).toBe("1,400 saved");
    expect(rowValue("inspections", facts({ openInspections: 1 }), "en")).toBe("1 open");
  });

  it("states a wallet balance through the shared money formatter, zero included", () => {
    expect(rowValue("wallet", facts({ walletMinor: 24568000 }), "en")).toMatch(/245,680$/);
    expect(rowValue("wallet", facts({ walletMinor: 0 }), "en")).toMatch(/0$/);
    expect(rowValue("wallet", facts({ walletMinor: 4200075 }), "en")).toMatch(/42,000\.75$/);
  });
});

describe("switchRoleLine: names only what the account holds", () => {
  it("never says admin to somebody who is not staff", () => {
    expect(switchRoleLine([])).not.toMatch(/admin/);
    expect(switchRoleLine([{ kind: "agent" }])).toBe("Change between user and agent");
    expect(switchRoleLine([{ kind: "owner" }, { kind: "firm" }])).not.toMatch(/admin/);
  });

  it("offers what can be applied for when nothing is held", () => {
    expect(switchRoleLine([])).toBe("Add an owner, agent or firm workspace");
  });

  it("reads as the render only for an agent who is also staff", () => {
    expect(switchRoleLine([{ kind: "agent" }, { kind: "console" }])).toBe(
      "Change between user, agent or admin",
    );
  });

  it("names a kind once however many are held", () => {
    expect(switchRoleLine([{ kind: "firm" }, { kind: "firm" }])).toBe("Change between user and firm");
  });
});

describe("switchParamTarget: the live ?switch= links", () => {
  const roles = (owner: Partial<RoleState>): RoleState[] => [
    { id: "renter", setUp: true, verified: false },
    { id: "owner", setUp: false, verified: false, ...owner },
    { id: "professional", setUp: false, verified: false },
  ];

  it("leaves the page alone without the parameter", () => {
    expect(switchParamTarget(undefined, roles({}))).toBeNull();
    expect(switchParamTarget("renter", roles({}))).toBeNull();
    expect(switchParamTarget(["owner"], roles({}))).toBeNull();
  });

  it("sends a role not set up to its setup", () => {
    expect(switchParamTarget("owner", roles({}))).toBe("/profile/setup/owner");
    expect(switchParamTarget("professional", roles({}))).toBe("/profile/setup/professional");
  });

  it("sends a waiting application to its status, never a second application", () => {
    expect(switchParamTarget("owner", roles({ setUp: true }))).toBe("/profile/application");
  });

  it("sends a verified role to its workspace", () => {
    expect(switchParamTarget("owner", roles({ setUp: true, verified: true }))).toBe("/agent/dashboard");
  });
});
