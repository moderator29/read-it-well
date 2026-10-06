import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { REFERRAL_STATUSES, REFERRAL_TRANSITIONS, canMove, isReferralStatus } from "./lifecycle";

const MIGRATION = join(__dirname, "../../../../../supabase/migrations/20261006152509_b4_referral_rewards_engine.sql");
const sql = readFileSync(MIGRATION, "utf8");

describe("referral lifecycle mirrors the database", () => {
  it("lists the same statuses as the table's check", () => {
    const check = /status in\s*\(\s*('pending'[^)]*)\)/.exec(sql)?.[1] ?? "";
    const fromSql = [...check.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(fromSql).toEqual([...REFERRAL_STATUSES]);
  });

  it("lists exactly the transitions private.referral_transition_ok allows", () => {
    const body = /referral_transition_ok[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(sql)?.[1] ?? "";
    const pairs = [...body.matchAll(/\('([a-z_]+)','([a-z_]+)'\)/g)].map((m) => [m[1], m[2]]);
    expect(pairs).toEqual(REFERRAL_TRANSITIONS.map(([a, b]) => [a, b]));
  });

  it("never lets a pending referral become paid, and never un-reverses", () => {
    expect(canMove("pending", "paid")).toBe(false);
    expect(canMove("pending", "available")).toBe(false);
    for (const to of REFERRAL_STATUSES) if (to !== "reversed") expect(canMove("reversed", to)).toBe(false);
    expect(canMove("processing", "paid")).toBe(true);
    expect(canMove("paid", "reversed")).toBe(true);
  });

  it("recognises statuses", () => {
    expect(isReferralStatus("under_review")).toBe(true);
    expect(isReferralStatus("banned")).toBe(false);
  });

  it("the migration keeps the rules the lead's tooling needs", () => {
    const code = sql.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/drop\s+trigger/i);
    expect(code).not.toMatch(/delete\s+from/i);
    expect(code).toMatch(/raise exception 'b4_referral_rewards_engine did not land/);
  });

  it("the rewards are never called a wallet in the schema", () => {
    const code = sql.replace(/--[^\n]*/g, "");
    expect(code).not.toMatch(/create table[^\n]*wallet/i);
  });
});
