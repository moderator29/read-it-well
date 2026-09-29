import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  alsoHandle,
  checkNote,
  classifyPeopleTerm,
  consentReceipt,
  KYC_CONSENT_WORDS,
  kycState,
  personName,
  tallyBy,
} from "./member-file-rules";
import { waitingSince } from "./support-rules";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("the people search reads what was typed", () => {
  it("knows an id, an email, a handle and a name apart", () => {
    expect(classifyPeopleTerm("03F3DD52-EA28-4852-9ABE-E5B0A67C2A43")).toEqual({ by: "id", value: "03f3dd52-ea28-4852-9abe-e5b0a67c2a43" });
    expect(classifyPeopleTerm(" Ada@Example.com ")).toEqual({ by: "email", value: "ada@example.com" });
    expect(classifyPeopleTerm("@Tunde_B")).toEqual({ by: "handle", value: "tunde_b" });
    expect(classifyPeopleTerm("Ada  Obi")).toEqual({ by: "name", value: "Ada Obi", raw: "Ada  Obi" });
  });

  it("strips the characters that would restructure a PostgREST filter or match everybody", () => {
    expect(classifyPeopleTerm("a,b(c)*%_d")).toMatchObject({ by: "name", value: "abcd" });
    expect(classifyPeopleTerm("%%")).toBeNull();
    expect(classifyPeopleTerm("a")).toBeNull();
    expect(classifyPeopleTerm("")).toBeNull();
    expect(classifyPeopleTerm("@x")).toBeNull();
  });

  it("tries a single word as a handle too, underscore kept, and a phrase not", () => {
    /* Through the classifier, as the search does: the name value loses the
       `_` (a LIKE wildcard) but the handle is tried as typed. */
    const typed = classifyPeopleTerm("Tunde_b");
    expect(typed).toEqual({ by: "name", value: "Tundeb", raw: "Tunde_b" });
    expect(alsoHandle(typed!)).toBe("tunde_b");
    expect(alsoHandle(classifyPeopleTerm("Ada Obi")!)).toBeNull();
    expect(alsoHandle(classifyPeopleTerm("a@b.co")!)).toBeNull();
  });
});

describe("a person's name on the desk", () => {
  it("prefers the display name, then the registered names, then says nothing", () => {
    expect(personName({ display_name: " Ada ", first_name: "Adaeze", surname: "Obi" })).toBe("Ada");
    expect(personName({ display_name: "", first_name: "Adaeze", surname: "Obi" })).toBe("Adaeze Obi");
    expect(personName({ display_name: null, first_name: null, surname: "Obi" })).toBe("Obi");
    expect(personName({ display_name: "  " })).toBeNull();
    expect(personName(null)).toBeNull();
  });
});

describe("tallies read the same every load", () => {
  it("orders by count, then by key", () => {
    expect(tallyBy(["b", "a", "b", null, "a", "c"], (x) => x)).toEqual([
      { key: "a", count: 2 },
      { key: "b", count: 2 },
      { key: "c", count: 1 },
      { key: "unknown", count: 1 },
    ]);
  });
});

describe("a staff note is checked as the table checks it", () => {
  it("refuses the empty and the oversized, and trims", () => {
    expect(checkNote("  ok  ")).toEqual({ ok: false, error: expect.any(String) });
    expect(checkNote("Rang them.")).toEqual({ ok: true, body: "Rang them." });
    expect(checkNote("x".repeat(2001)).ok).toBe(false);
    expect(checkNote(undefined).ok).toBe(false);
  });
});

describe("where somebody stands on verification", () => {
  const d = (kind: string, reviewStatus: string, uploadedAt: string) => ({ kind, reviewStatus, uploadedAt });
  it("counts only the newest document of each kind", () => {
    expect(kycState([])).toBe("none");
    expect(kycState([d("identity", "rejected", "2026-09-01"), d("identity", "approved", "2026-09-02")])).toBe("approved");
    expect(kycState([d("identity", "approved", "2026-09-02"), d("address", "pending", "2026-09-03")])).toBe("pending");
    expect(kycState([d("identity", "approved", "2026-09-02"), d("address", "rejected", "2026-09-03")])).toBe("partial");
    expect(kycState([d("identity", "rejected", "2026-09-02")])).toBe("rejected");
  });
});

describe("the consent receipt", () => {
  it("carries the form's own words for all three agreements", () => {
    expect(Object.keys(KYC_CONSENT_WORDS).sort()).toEqual(["accuracy", "processing", "terms"]);
    for (const words of Object.values(KYC_CONSENT_WORDS)) expect(words.length).toBeGreaterThan(20);
  });

  it("shows the latest time each was given and names the missing ones in words", () => {
    const r = consentReceipt([
      { consent: "accuracy", consentedAt: "2026-09-01T10:00:00Z" },
      { consent: "accuracy", consentedAt: "2026-09-20T10:00:00Z" },
      { consent: "terms", consentedAt: "2026-09-20T10:00:00Z" },
    ]);
    expect(r.given.map((g) => [g.consent, g.at])).toEqual([
      ["accuracy", "2026-09-20T10:00:00Z"],
      ["terms", "2026-09-20T10:00:00Z"],
    ]);
    expect(r.missing).toEqual([KYC_CONSENT_WORDS.processing]);
    expect(consentReceipt([]).missing).toHaveLength(3);
  });
});

describe("the support clock runs from the member's unanswered message", () => {
  it("starts at filing, stops on our reply, restarts when they write again", () => {
    expect(waitingSince("2026-09-01T08:00:00Z", [])).toBe("2026-09-01T08:00:00Z");
    expect(waitingSince("2026-09-01T08:00:00Z", [{ role: "user", at: "2026-09-01T09:00:00Z" }])).toBe("2026-09-01T08:00:00Z");
    expect(waitingSince("2026-09-01T08:00:00Z", [{ role: "admin", at: "2026-09-01T09:00:00Z" }])).toBeNull();
    expect(
      waitingSince("2026-09-01T08:00:00Z", [
        { role: "user", at: "2026-09-01T12:00:00Z" },
        { role: "admin", at: "2026-09-01T09:00:00Z" },
        { role: "user", at: "2026-09-01T13:00:00Z" },
      ]),
    ).toBe("2026-09-01T12:00:00Z");
  });
});

describe("who each new door lets in", () => {
  it("keeps the member search, the member file and notes to admins, never a staff scope", () => {
    expect(read("./member-queries.ts")).not.toMatch(/requireAdmin\("/);
    /* staff_grants through the operator's own RLS client, never the service client. */
    expect(read("./member-queries.ts")).toMatch(/loose\(db\)\.from\("staff_grants"\)/);
    expect(read("./member-queries.ts")).not.toMatch(/loose\(service\)\.from\("staff_grants"\)/);
    expect(read("./member-actions.ts")).not.toMatch(/requireAdmin\("/);
    expect(read("./member-actions.ts")).toMatch(/access\.userClient/);
  });

  it("opens the support desk's own reads and claims on the support scope", () => {
    expect(read("./support-desk.ts").match(/await requireAdmin\("support"\)/g)).toHaveLength(2);
    expect(read("./support-desk-actions.ts").match(/await requireAdmin\("support"\)/g)).toHaveLength(2);
    expect(read("./support-desk-actions.ts")).toMatch(/access\.userClient/);
  });

  it("opens the held and reports lanes to moderation-scoped staff", () => {
    for (const file of ["./moderation-queries.ts", "./moderation-actions.ts", "./reads/moderation.ts", "./overdue-reports.ts", "../../app/admin/_lanes/HeldLane.tsx"]) {
      expect(read(file), file).toMatch(/requireAdmin\("moderation"\)/);
      expect(read(file), file).not.toMatch(/requireAdmin\(\)/);
    }
  });

  it("decides a held item only through moderation_decide, as the caller, never by a direct table write", () => {
    const action = read("./moderation-actions.ts");
    expect(action).toMatch(/access\.userClient[\s\S]*\.rpc\("moderation_decide"/);
    expect(action).not.toMatch(/\.from\("(posts|stories|story_comments|social_profiles)"\)/);
    expect(action).not.toMatch(/access\.supabase/);
    expect(action).not.toMatch(/writeAudit/);
  });
});
