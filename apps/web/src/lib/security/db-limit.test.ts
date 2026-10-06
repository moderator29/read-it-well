import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DB_LIMIT_MESSAGE, dbLimitRefusal } from "./db-limit";

/**
 * SEC-09: the database's per-member insert limit refuses with 54000 and a
 * sentence; every action that writes to a limited table shows that sentence
 * instead of its generic "try again".
 */
describe("the database's rate refusal", () => {
  it("reads 54000 as the database's own sentence, and nothing else", () => {
    expect(dbLimitRefusal({ code: "54000", message: "Slow down, please." })).toBe("Slow down, please.");
    expect(dbLimitRefusal({ code: "54000", message: "" })).toBe(DB_LIMIT_MESSAGE);
    expect(dbLimitRefusal({ code: "42501", message: "no" })).toBeNull();
    expect(dbLimitRefusal(null)).toBeNull();
  });

  it("is what the migration raises", () => {
    const sql = readFileSync(
      join(__dirname, "..", "..", "..", "..", "..", "supabase", "migrations", "20260924022108_sec_09_a_member_is_rate_limited_where_the_write_happens.sql"),
      "utf8",
    );
    expect(sql).toContain(`raise exception '${DB_LIMIT_MESSAGE}'`);
    expect(sql).toContain("errcode = 'program_limit_exceeded'");
  });

  it("is handled by every action that writes to a limited table", () => {
    const src = (p: string) => readFileSync(join(__dirname, "..", "..", p), "utf8");
    expect(src("lib/messages/actions.ts").match(/dbLimitRefusal\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(src("lib/social/posts-actions.ts")).toContain("case DB_LIMIT_CODE:");
    expect(src("lib/social/posts-actions.ts").match(/dbLimitRefusal\(error\) \?\? POST_FAILURE\.down/g)?.length).toBe(2);
    expect(src("lib/social/stories-model.ts")).toContain("case DB_LIMIT_CODE:");
    expect(src("lib/reports/actions.ts")).toContain("dbLimitRefusal(error)");
    expect(src("lib/reviews/actions.ts")).toContain("dbLimitRefusal(insertError)");
    expect(src("lib/agent/listings-actions.ts")).toContain("dbLimitRefusal(error) ?? SAVE_FAILED_MESSAGE");
  });
});
