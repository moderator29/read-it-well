import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  MEMBER_REFERRAL_STATUSES,
  REFERRAL_STATUSES,
  REFERRAL_TRANSITIONS,
  canMove,
  isReferralStatus,
  memberStatusOf,
} from "./lifecycle";

const MIGRATION = join(__dirname, "../../../../../supabase/migrations/20261006154817_b4_referral_campaigns.sql");
const sql = readFileSync(MIGRATION, "utf8");
const code = sql.replace(/--[^\n]*/g, "");

describe("referral lifecycle mirrors the database", () => {
  it("lists the same statuses as the table's check", () => {
    const check = /status in\s*\(\s*('attributed'[^)]*)\)/.exec(code)?.[1] ?? "";
    const fromSql = [...check.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(fromSql).toEqual([...REFERRAL_STATUSES]);
  });

  it("lists exactly the transitions private.referral_transition_ok allows", () => {
    const body = /referral_transition_ok[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(code)?.[1] ?? "";
    const pairs = [...body.matchAll(/\('([a-z_]+)','([a-z_]+)'\)/g)].map((m) => [m[1], m[2]]);
    expect(pairs).toEqual(REFERRAL_TRANSITIONS.map(([a, b]) => [a, b]));
  });

  it("has a review window between qualified and available", () => {
    expect(canMove("qualified", "available")).toBe(false);
    expect(canMove("qualified", "pending")).toBe(true);
    expect(canMove("pending", "available")).toBe(true);
  });

  it("pays only from sent, and never un-reverses", () => {
    expect(canMove("attributed", "paid")).toBe(false);
    expect(canMove("available", "paid")).toBe(false);
    expect(canMove("withdrawal_requested", "paid")).toBe(false);
    expect(canMove("sent", "paid")).toBe(true);
    expect(canMove("paid", "reversed")).toBe(true);
    for (const to of REFERRAL_STATUSES) if (to !== "reversed") expect(canMove("reversed", to)).toBe(false);
  });

  it("under review is reversible, and rejected only goes on to reversed", () => {
    expect(canMove("under_review", "approved")).toBe(true);
    expect(canMove("under_review", "rejected")).toBe(true);
    expect(canMove("under_review", "available")).toBe(false);
    expect(REFERRAL_STATUSES.filter((to) => to !== "rejected" && canMove("rejected", to))).toEqual(["reversed"]);
  });

  it("recognises statuses", () => {
    expect(isReferralStatus("under_review")).toBe(true);
    expect(isReferralStatus("banned")).toBe(false);
  });

  it("maps every status to member words, never showing review", () => {
    for (const s of REFERRAL_STATUSES) expect(MEMBER_REFERRAL_STATUSES).toContain(memberStatusOf(s));
    expect(memberStatusOf("under_review")).toBe("pending");
    expect(memberStatusOf("sent")).toBe("sent");
    expect(memberStatusOf("rejected")).toBe("not_rewarded");
  });

  it("the member mapping matches public.my_referrals", () => {
    const body = /function public\.my_referrals[\s\S]*?\$\$([\s\S]*?)\$\$/.exec(code)?.[1] ?? "";
    for (const s of MEMBER_REFERRAL_STATUSES) expect(body).toContain(`'${s}'`);
  });

  it("the migration keeps the rules the lead's tooling needs", () => {
    expect(sql).not.toMatch(/drop\s+trigger/i);
    expect(sql).not.toMatch(/delete\s+from/i);
    expect(code).not.toMatch(/^\s*(begin|commit)\s*;/im);
    expect(code).toMatch(/raise exception 'b4_referral_campaigns did not land/);
  });

  it("no new object trips the live custody name guard", () => {
    const names = [...code.matchAll(/create (?:table|index|or replace function|or replace trigger)(?: if not exists)?\s+(?:[a-z_]+\.)?([a-z0-9_]+)/gi)].map(
      (m) => (m[1] ?? "").toLowerCase(),
    );
    expect(names.length).toBeGreaterThan(20);
    for (const n of names) {
      expect(n).not.toMatch(/(^|_)(wallets?|escrows?|pots?)(_|$)/);
      expect(n.startsWith("held_payment")).toBe(false);
    }
  });

  it("the rewards are never called a wallet in the schema", () => {
    expect(code).not.toMatch(/create table[^\n]*wallet/i);
  });
});
