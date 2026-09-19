import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * ONE BADGE, ONE DERIVATION, AND THIS TEST IS THE THING THAT KEEPS IT THAT WAY.
 *
 * Rule 12: the verified badge only ever means a human was checked. For an
 * agent that sentence has exactly one true derivation, and it is the KYC
 * ladder:
 *
 *   agent_verification_checks  one row per rung, each a named member of
 *        |                     staff's recorded decision
 *        |  private.agent_tier() via private.sync_agent_verification_tier
 *        v
 *   agents.verification_tier   rungs passed with no gap below them, 0 to 4
 *        |  private.sync_agent_badge
 *        v
 *   agent_badges.verified      := verification_tier >= 1, and this is the
 *                                published fact every surface reads
 *
 * THE FAULT THIS EXISTS TO STOP COMING BACK. There used to be a second
 * derivation: `agents.verified`, a hand-set boolean, which the agent
 * application approval wrote as `true` at tier 0, before one document had been
 * looked at, alongside a notification titled "You are a verified Vallo agent".
 * Messaging, the social profile badge and the chat chip read that boolean;
 * every listing surface read the ladder. So from the first approval a reader
 * deciding whether to send a deposit to a stranger would have seen a verified
 * tick in the message thread and no tick at all on the listing behind it, with
 * no way to tell which screen was lying, while the agent's own dashboard said
 * they had not started.
 *
 * It was never visible in production: it fires on the first approval and none
 * had been made. It is closed in the database by
 * `20260919230000_p2_a_verified_agent_means_a_person_was_checked`, which
 * derives the column from the tier and constrains it, and in this codebase by
 * removing the write and repointing the read.
 *
 * WHAT THIS TEST ADDS OVER THE MIGRATION'S OWN PROBE. The probe proves the
 * database cannot hold the bad state. This proves the CODE does not go looking
 * for it: that no read anywhere in `src` asks `agents` for its raw `verified`
 * column, and that the approval does not write it. Those are the two edits
 * that would quietly recreate a second derivation, and neither would fail a
 * typecheck, a lint or any other test in this repository.
 */

const SRC = fileURLToPath(new URL("../..", import.meta.url));
const MIGRATION = fileURLToPath(
  new URL(
    "../../../../../supabase/migrations/20260919230000_p2_a_verified_agent_means_a_person_was_checked.sql",
    import.meta.url,
  ),
);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      sourceFiles(path, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    out.push(path);
  }
  return out;
}

/**
 * The column lists of every PostgREST select made against `agents`.
 *
 * An embed such as `agent_badges(verified)` is stripped before the list is
 * split, so a select that reaches THROUGH to the published badge is not
 * mistaken for one that reads the raw column.
 */
function agentSelectColumns(source: string): string[][] {
  const lists: string[][] = [];
  const from = /\.from\(\s*["'`]agents["'`]\s*\)/g;
  let hit: RegExpExecArray | null;
  while ((hit = from.exec(source)) !== null) {
    const window = source.slice(hit.index, hit.index + 600);
    const select = /\.select\(\s*["'`]([^"'`]*)["'`]/.exec(window);
    const columns = select?.[1];
    if (columns === undefined) continue;
    lists.push(
      columns
        .replace(/[\w]+\s*\([^)]*\)/g, "")
        .split(",")
        .map((column) => column.trim())
        .filter(Boolean),
    );
  }
  return lists;
}

describe("the agent verified badge has one derivation", () => {
  it("is read from nowhere in the app but the published agent_badges row", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, "utf8");
      if (!source.includes('.from("agents")')) continue;
      for (const columns of agentSelectColumns(source)) {
        if (columns.includes("verified")) offenders.push(file.slice(SRC.length));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("is not written by the agent application approval, because approval is not a check", () => {
    const actions = readFileSync(join(SRC, "lib/admin/actions.ts"), "utf8");
    const upsert = /\.from\(\s*"agents"\s*\)\s*\.upsert\(([\s\S]{0,600}?)\{\s*onConflict/.exec(
      actions,
    );
    expect(upsert).not.toBeNull();
    expect(upsert?.[1]).not.toMatch(/\bverified\s*:/);
  });

  it("is not claimed by the approval notification either, because the word is reserved", () => {
    const actions = readFileSync(join(SRC, "lib/admin/actions.ts"), "utf8");
    expect(actions).not.toContain("You are a verified Vallo agent");
  });

  it("is reached through agent_badges by the messaging read that draws the tick", () => {
    const live = readFileSync(join(SRC, "lib/messages/live.ts"), "utf8");
    expect(live).toContain("agent_badges(verified)");
  });

  it("is documented on VerifiedAvatar as coming from agent_badges", () => {
    const avatar = readFileSync(join(SRC, "components/messages/VerifiedAvatar.tsx"), "utf8");
    expect(avatar).toContain("WHERE THE TRUTH COMES FROM. `agent_badges.verified`");
  });

  it("cannot be true below tier 1, and the social badge no longer claims a payout rung", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const body = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(body).toContain("agents_verified_means_identity_chk");
    expect(body).toContain("check (verified = false or verification_tier >= 1)");
    expect(body).toContain("new.verified := coalesce(new.verification_tier, 0) >= 1");
    expect(body).toContain("coalesce(new.verification_tier, 0) < 1");
    expect(body).not.toContain("Identity and payout account verified");
    expect(body).toContain("Identity checked by a person at Vallo.");
  });

  it("revokes the function it creates from anon and authenticated in the same migration", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const body = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(body).toContain(
      "revoke execute on function private.derive_agent_badge() from public, anon, authenticated;",
    );
    expect(body).toContain(
      "revoke execute on function private.award_agent_badges() from public, anon, authenticated;",
    );
  });
});
