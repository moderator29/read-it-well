import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDictionary } from "@vallo/i18n";

import { passportFrom, passportLines, sharedInLine } from "./passport";

const copy = getDictionary("en").trustVisible.passport;

describe("the renter passport (V-100)", () => {
  it("prints what Vallo recorded, in order", () => {
    const facts = passportFrom([
      {
        phone_confirmed: true,
        nimc_matched_at: "2026-08-12T10:00:00Z",
        inspections_attended: 4,
        tenancies: 1,
        member_since: "2026-03-02T10:00:00Z",
      },
    ]);
    expect(passportLines(facts, copy, "en").map((l) => l.text)).toEqual([
      "Phone confirmed",
      "Identity matched with NIMC, 12 Aug 2026",
      "4 inspections attended, recorded at the gate by both phones",
      "1 tenancy paid through Vallo",
      "On Vallo since March 2026",
    ]);
  });

  it("prints nothing for a false, a null or a zero", () => {
    const facts = passportFrom({ phone_confirmed: false, nimc_matched_at: null, inspections_attended: 0, tenancies: 0, member_since: null });
    expect(passportLines(facts, copy, "en")).toEqual([]);
    expect(passportFrom([])).toBeNull();
    expect(passportLines(null, copy, "en")).toEqual([]);
  });

  it("counts where it is shown", () => {
    expect(sharedInLine(0, copy)).toBe(copy.sharedInNone);
    expect(sharedInLine(1, copy)).toBe("Shown in 1 conversation.");
    expect(sharedInLine(3, copy)).toBe("Shown in 3 conversations.");
  });

  it("never offers a line for a missed inspection, a reference or an employer", () => {
    expect(Object.keys(copy).join(" ")).not.toMatch(/missed|noShow|employer|reference/i);
  });

  it("is off by default and read by the lister only through the thread function", () => {
    const sql = readFileSync(
      join(__dirname, "../../../../../supabase/migrations/20260924131500_v100_the_renter_passport.sql"),
      "utf8",
    );
    expect(sql).toContain("enabled    boolean not null default false");
    expect(sql).toContain("and c.agent_id = (select auth.uid());");
  });
});

describe("where the passport is drawn", () => {
  const root = join(__dirname, "..", "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");

  it("reaches the lister only in the thread header, and gives the renter the switch", () => {
    const page = read("app/(app)/messages/[id]/page.tsx");
    expect(page).toContain('role === "host"');
    expect(page).toContain("readThreadPassport(id)");
    expect(page).toContain('role === "guest" ? await readPassportShareState(id)');
    expect(read("app/(app)/messages/[id]/ThreadView.tsx")).toContain('data-testid="thread-passport"');
    expect(read("app/(app)/messages/[id]/ThreadOptionsSheet.tsx")).toContain("<PassportShareRow");
  });

  it("has a settings page with a loading state, reached from the hub", () => {
    expect(read("app/(app)/settings/passport/page.tsx")).toContain("<PassportSwitch");
    expect(read("app/(app)/settings/passport/loading.tsx")).toContain("LoadingShell");
    expect(read("app/(app)/settings/SettingsHub.tsx")).toContain('href="/settings/passport"');
  });
});

describe("after review (V-100)", () => {
  const root = join(__dirname, "..", "..");
  it("counts an inspection only when both phones recorded it, and never with the renter's shadow", () => {
    const sql = readFileSync(join(root, "../../../supabase/migrations/20260924131500_v100_the_renter_passport.sql"), "utf8");
    expect(sql).toContain("k.role = 'shower' and k.result = 'shown'");
    expect(sql).toContain("cardinality(private.shares_identity_with(p_user, r.lister_id)) = 0");
    expect(copy.attended).toContain("both phones");
  });

  it("draws nothing in the thread when the passport is off", () => {
    const row = readFileSync(join(root, "components/app/safety/PassportShareRow.tsx"), "utf8");
    expect(row).toContain("if (!initial.enabled) return null;");
  });
});
