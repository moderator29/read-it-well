import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { REQUIREMENT_COPY, REQUIREMENT_KEYS, isRequirementKey, requirementLines } from "./requirements";

const MIGRATION = join(__dirname, "../../../../../supabase/migrations/20261006154817_b4_referral_campaigns.sql");
const code = readFileSync(MIGRATION, "utf8").replace(/--[^\n]*/g, "");

describe("the requirement registry mirrors the database", () => {
  const seeded = (() => {
    const block = /insert into public\.referral_requirements[\s\S]*?on conflict/.exec(code)?.[0] ?? "";
    return [...block.matchAll(/\(\s*'([a-z_]+)',\s*'private\.referral_req_([a-z_]+)'/g)].map((m) => [m[1], m[2]]);
  })();

  it("seeds exactly these keys, each backed by its own named function", () => {
    expect(seeded.map(([k]) => k)).toEqual([...REQUIREMENT_KEYS]);
    for (const [key, fn] of seeded) {
      expect(fn).toBe(key);
      expect(code).toMatch(new RegExp(`create or replace function private\\.referral_req_${key}\\(p_user uuid, p_params jsonb\\)`));
    }
  });

  it("dispatches every key through a fixed CASE, never dynamic SQL", () => {
    const body = /function private\.referral_requirement_check[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(code)?.[1] ?? "";
    for (const key of REQUIREMENT_KEYS) {
      expect(body).toContain(`when '${key}'`);
      expect(body).toContain(`private.referral_req_${key}(p_user, p_params)`);
    }
    expect(body).not.toMatch(/\bexecute\b/i);
  });

  it("has member copy for every key, with no projection", () => {
    for (const key of REQUIREMENT_KEYS) expect(REQUIREMENT_COPY[key].length).toBeGreaterThan(5);
    for (const line of Object.values(REQUIREMENT_COPY)) expect(line).not.toMatch(/earn up to|safe|guarantee/i);
  });

  it("drops unknown keys from what a member is shown", () => {
    expect(isRequirementKey("phone_verified")).toBe(true);
    expect(isRequirementKey("meaningful_activity_for_hotels")).toBe(false);
    expect(requirementLines(["phone_verified", "nope", "email_verified"])).toEqual([
      REQUIREMENT_COPY.phone_verified,
      REQUIREMENT_COPY.email_verified,
    ]);
    expect(requirementLines(null)).toEqual([]);
  });
});
