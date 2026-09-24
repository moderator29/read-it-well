import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * OPS-P2-02: production sits under personal account names, and only the
 * founder can move it. This pins the runbook that says exactly how, and
 * fails once the ownership table is filled in so this test is revisited
 * (and turned into a check of what was recorded) when the move is done.
 */
const DEPLOY = readFileSync(join(__dirname, "..", "..", "..", "..", "..", "docs", "DEPLOY.md"), "utf8");
const section = DEPLOY.slice(DEPLOY.indexOf("## 0. Who owns the accounts"), DEPLOY.indexOf("## 1. What is in the box"));

describe("the account ownership runbook (OPS-P2-02)", () => {
  it("names the live project and gives both transfers step by step", () => {
    expect(section.length).toBeGreaterThan(500);
    expect(section).toContain("uccixoonmbhrnyczyigt");
    expect(section).toContain("Project Settings → General → Transfer project");
    expect(section).toContain("Settings → General → Transfer Project");
    expect(section).toMatch(/second person as \*\*Owner\*\*|second \*\*Owner\*\*/);
  });

  it("still waits on the founder: the ownership table is unfilled", () => {
    expect(section).toContain("| Supabase | *to fill");
  });
});
