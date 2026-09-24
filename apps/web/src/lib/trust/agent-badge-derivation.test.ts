import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
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
 * ---------------------------------------------------------------------------
 * AND SINCE 23 SEPTEMBER THE BADGE HAS TWO TIERS, SO THIS GUARD HAS A SECOND
 * JOB: NOTHING IN `src` MAY DERIVE A TIER EITHER.
 *
 * The chain gained one link and nothing above it moved:
 *
 *   agent_badges.verified   +   user_roles (admin, super_admin)
 *        |                              |
 *        |  public.is_checked_person    |  public.is_platform_staff
 *        v                              v
 *            public.badge_tier(is_staff, is_checked)
 *                            |
 *                            v
 *        public.person_badge.tier  and  public.agent_badges.tier
 *
 * `lib/trust/badge-tier.ts` READS that and decides nothing.
 * `components/trust/TierBadge.tsx` DRAWS it and decides nothing. Those two
 * files are the only ones allowed to mention a tier by name in a way that
 * PRODUCES or COMPARES one, and the assertions below enforce that across every
 * `.ts` and `.tsx` in `src`.
 *
 * THE FAULT THIS HALF EXISTS TO STOP WAS ALREADY SHIPPING WHEN THIS HALF WAS
 * WRITTEN. `ProfileHeader` and `PeopleList` drew the verified tick from
 * `social_profiles.is_agent`, whose own column comment in the database reads
 * "a role marker, not an earned badge" and which is true from the moment an
 * agent application is APPROVED, at verification tier 0, before one document
 * has been looked at. So the social profile said checked and every listing
 * behind it said nothing: the identical defect this file was written for,
 * reborn on a different surface, with nothing watching it. That is why the
 * rules below are about the SHAPE of a derivation rather than about one column
 * name.
 *
 * WHY A LITERAL IN A FIXTURE IS ALLOWED AND A LITERAL IN A TERNARY IS NOT.
 * Stating a tier (`badgeTier: "gold"`) is data. Computing one
 * (`isAgent ? "gold" : "none"`) or branching on one (`tier === "platinum"`) is
 * a derivation, and a second derivation is two screens that can disagree about
 * a stranger somebody is about to send money to. The patterns below draw the
 * line exactly there, on purpose.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ADDS OVER THE MIGRATION'S OWN PROBE. The probe proves the
 * database cannot hold the bad state. This proves the CODE does not go looking
 * for it: that no read anywhere in `src` asks `agents` for its raw `verified`
 * column, that the approval does not write it, and that no file computes a
 * tier. Those are the edits that would quietly recreate a second derivation,
 * and not one of them would fail a typecheck, a lint or any other test in this
 * repository.
 */

/*
 * THIS FILE IS `.ts` AND NOT `.tsx`, AND THAT IS LOAD-BEARING.
 *
 * `vitest.config.ts` includes `src/**\/*.test.ts` and nothing else. A `.tsx`
 * test file is not excluded, not reported and not run: it simply is not
 * collected, and the suite goes green without it. This guard was briefly
 * written as `.tsx` to get JSX for the render assertions, and vitest answered
 * "No test files found" for it while the rest of the suite passed. A guard that
 * silently stops running is worse than no guard, because the green tick is
 * still there. So the render assertions use `createElement` instead, which
 * needs no JSX and keeps the file inside the glob that actually runs.
 */

const SRC = fileURLToPath(new URL("../..", import.meta.url));
const MIGRATION = fileURLToPath(
  new URL(
    "../../../../../supabase/migrations/20260919230000_p2_a_verified_agent_means_a_person_was_checked.sql",
    import.meta.url,
  ),
);
const TIER_MIGRATION = fileURLToPath(
  new URL(
    "../../../../../supabase/migrations/20260923111950_the_verified_badge_carries_a_tier_and_still_only_ever_means_a_person_was_checked.sql",
    import.meta.url,
  ),
);

/** The two files allowed to know what a tier is. Everything else asks them. */
const DERIVATION = "lib/trust/badge-tier.ts";
const RENDERER = "components/trust/TierBadge.tsx";

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

/** Where in `src`, for a failure message somebody can act on. */
function where(file: string): string {
  return file.slice(SRC.length).replace(/^[\\/]/, "");
}

/**
 * The file with its comments removed, split into lines.
 *
 * Every rule below is a rule about CODE. This repository documents its faults
 * in prose at length, and a guard that fired on the sentence describing the
 * bug it prevents would be unusable: this very file's header contains
 * `isAgent ? "gold" : "none"` as the example of what must never be written.
 * Line numbering is preserved, so a failure points at the real line.
 */
function codeLines(source: string): string[] {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""));
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
        if (columns.includes("verified")) offenders.push(where(file));
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

describe("the two badge tiers have that same one derivation", () => {
  it("is never PRODUCED from a role marker, a boolean, a ladder rung or a session", () => {
    /*
     * THREE SHAPES, AND EACH ONE IS A DERIVATION RATHER THAN A FACT.
     *
     *   A.  `=== "gold"`, `|| "platinum"`, `?? "gold"`  - comparing or falling
     *       back to a tier, which is a rule about which mark to draw.
     *   B.  a ternary yielding a tier on either arm, which is that same rule
     *       written the other way round.
     *   C.  `type X = "gold" | "platinum"`, which is the VOCABULARY declared a
     *       second time. This is not pedantry: the three files in the
     *       allowlist below each declare their own, and two of them already
     *       disagree with `BadgeTier` about how "no badge" is spelled - `null`
     *       against `"none"` - which is precisely how two screens end up
     *       disagreeing about a stranger.
     *
     * STATING a tier is still allowed. `badgeTier: "gold"` in a fixture is
     * data, and an object property's colon is not a ternary's, which is why
     * shape B needs a `?` on the line and not merely a `:`.
     *
     * Comments are stripped first, so the prose in this repository that
     * explains the fault - including this file's own header - does not trip a
     * rule about code.
     */
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const here = where(file);
      if (here === DERIVATION || here === RENDERER) continue;
      for (const [index, line] of codeLines(readFileSync(file, "utf8")).entries()) {
        if (!/["'`](?:gold|platinum)["'`]/.test(line)) continue;
        const produces =
          /(?:===|!==|==|!=|\|\||\?\?)\s*["'`](?:gold|platinum)["'`]/.test(line) ||
          (/\?/.test(line.replace(/\?\.|\?\?/g, "")) && /:/.test(line));
        if (!produces) continue;
        /*
         * WHAT SEPARATES A DERIVATION FROM A NARROWING IS THE SOURCE, SO THE
         * SOURCES ARE NAMED RATHER THAN GUESSED.
         *
         * `value === "gold" || value === "platinum" ? value : null` narrows
         * something already read from the published view: untidy, counted by
         * the ratchet below, but not a second derivation. `isAgent ? "gold" :
         * "none"` invents the answer from a role marker. A regex cannot see
         * which of those a bare identifier is, and the first draft of this
         * rule tried to tell them apart by whether the line said "tier",
         * which let `value` through as narrowing and would equally have let
         * `badgeTier: isAgent ? ...` through as narrowing. So the rule names
         * the FORBIDDEN sources instead. Every one of them is a fact this
         * product has already, at some point, drawn the badge from:
         *
         *   is_agent / isAgent   a role marker, true at approval, tier 0
         *   verified             the coarse boolean, and the LISTING has one
         *                        too, which the thread header was passing
         *   verification_tier    the ladder, whose rule lives in the database
         *   role / isAdmin       staff, which `is_platform_staff` answers
         *   status / approved    an application's state, not a check
         *
         * A new wrong source is a new entry here, which is a deliberate edit
         * somebody has to justify rather than a rule that quietly stopped
         * covering it.
         */
        const forbidden =
          /\b(?:is_?[Aa]gent|verified|verification_?[Tt]ier|is_?[Aa]dmin|isStaff|role|status|approved|session)\b/;
        if (!forbidden.test(line)) continue;
        offenders.push(`${here}:${index + 1}: ${line.trim().slice(0, 100)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("has its vocabulary declared once, and the count of copies only ever falls", () => {
    /*
     * SHAPE C, AND IT IS A RATCHET RATHER THAN A WALL, FOR A STATED REASON.
     *
     * `type BadgeTier = "gold" | "platinum"` written again somewhere else is
     * not a second derivation - those files do read the published tier - but
     * it is the vocabulary declared twice, and two of the copies below already
     * disagree with `BadgeTier` about how "no badge" is spelled, `null` against
     * `"none"`, while a third has no absent case at all and so cannot express
     * a person nobody has checked. That is drift, caught at the moment it
     * starts rather than after two screens contradict each other.
     *
     * WHY A COUNT AND NOT A LIST OF FILES. Every copy belongs to the other
     * session, which is writing these files right now: this guard found three
     * on its first run and six different ones twenty minutes later, as work
     * moved between files. A list of names would go red on their next rename
     * and turn main red for everybody, which ledger 49bis says outranks the
     * scope split. A ceiling cannot be gamed by moving code about, it fails
     * the moment a TENTH copy appears, and it can only be lowered.
     *
     * LOWER IT EVERY TIME ONE GOES. Each closes with a single import:
     *
     *   import { type BadgeTier, toBadgeTier } from "@/lib/trust/badge-tier";
     *
     * Filed to that session as ledger R17, with the list as it stood.
     */
    const copies: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const here = where(file);
      if (here === DERIVATION || here === RENDERER) continue;
      for (const [index, line] of codeLines(readFileSync(file, "utf8")).entries()) {
        if (!/["'`](?:gold|platinum)["'`]/.test(line)) continue;
        if (!/\btype\s+\w+\s*=|\?\s*:/.test(line)) continue;
        copies.push(`${here}:${index + 1}: ${line.trim().slice(0, 100)}`);
      }
    }
    /* 23 September: SEVEN, counted rather than estimated. An earlier draft of
       this ceiling said nine, from a looser pattern, and a mutation adding an
       eighth copy did NOT turn it red. A ratchet set above the real number is
       a blind light with a number on it. */
    expect(copies.length, `seven were recorded on 23 September; these are the copies now:\n${copies.join("\n")}`).toBeLessThanOrEqual(7);
  });

  it("is never computed from `is_agent`, which is a role marker and WAS the second derivation", () => {
    /*
     * `social_profiles.is_agent` deciding a mark, on ONE line with it. Two
     * adjacent fields in a type - `isAgent: boolean;` above `badgeTier:
     * BadgeTier;` - are not a derivation and must not be flagged, which is why
     * this is per line rather than per window: the first draft used a 300
     * character window and reported four type declarations and an object
     * literal, none of them a fault.
     */
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const here = where(file);
      if (here === DERIVATION || here === RENDERER) continue;
      for (const [index, line] of codeLines(readFileSync(file, "utf8")).entries()) {
        if (!/\bis_?[Aa]gent\b/.test(line)) continue;
        if (!/\b(?:gold|platinum|badgeTier|TierBadge)\b/.test(line)) continue;
        if (!/[?]|&&|\|\||===|!==/.test(line)) continue;
        offenders.push(`${here}:${index + 1}: ${line.trim().slice(0, 100)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("is never computed from the ladder in the app, because that rule lives in the database", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const here = where(file);
      if (here === DERIVATION || here === RENDERER) continue;
      for (const [index, line] of codeLines(readFileSync(file, "utf8")).entries()) {
        if (!/\bverification_?[Tt]ier\b/.test(line)) continue;
        if (!/\b(?:gold|platinum|badgeTier|TierBadge)\b/.test(line)) continue;
        offenders.push(`${here}:${index + 1}: ${line.trim().slice(0, 100)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("is drawn by one component, so the mark cannot become two different marks", () => {
    /*
     * The seal path and the amber custom properties may each exist in exactly
     * one file. A second copy of either is a second renderer by another name,
     * and two renderers is how the marks drift apart between screens.
     */
    const seal: string[] = [];
    const paint: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const source = readFileSync(file, "utf8");
      const here = where(file);
      if (here === RENDERER) continue;
      if (source.includes("M12 1C12.65 1 13.38 1.74")) seal.push(here);
      if (source.includes("--nf-badge-gold-")) paint.push(here);
    }
    expect(seal).toEqual([]);
    expect(paint).toEqual([]);
  });

  it("reaches the database through the published view and through nothing of its own", () => {
    const derivation = readFileSync(join(SRC, DERIVATION), "utf8");
    expect(derivation).toContain('PERSON_BADGE_VIEW = "person_badge"');
    /*
     * The module may READ a tier. It may not decide one. `toBadgeTier` is the
     * single parser and is allowed its comparison; nothing else in the file
     * may branch on a tier literal.
     */
    const code = codeLines(derivation).join("\n");
    const parser = /export function toBadgeTier[\s\S]*?\n}/.exec(code);
    expect(parser).not.toBeNull();
    const rest = code.replace(parser?.[0] ?? "", "");
    expect(rest).not.toMatch(/(?:===|!==|==|!=|\|\||\?\?)\s*["'`](?:gold|platinum)["'`]/);
  });
});

describe("the mark on the screen, read off the rendered DOM of the real component", () => {
  /*
   * THE RENDER HAPPENS IN A CHILD PROCESS, AND THAT IS NOT A DODGE.
   *
   * This suite runs under the `react-server` condition with `react` aliased at
   * its React Server Components build, because the server modules it exists for
   * have different `cache` semantics under any other build (see the docstring
   * in `vitest.config.ts`). That build CANNOT render: `react-dom/server` under
   * `react-server` throws "react-dom/server is not supported in React Server
   * Components" on purpose, and the two builds refuse to be mixed. Measured,
   * both ways, rather than assumed.
   *
   * So `scripts/probes/badge_mark_dom.mjs` bundles the real
   * `components/trust/TierBadge.tsx` and renders it under the ordinary client
   * conditions, and this test runs that file and reads its verdict. The check
   * stays inside the suite; the shared config is
   * not touched to get it there.
   *
   * IT ASSERTS ON WHAT HAPPENED, NOT THAT IT TRIED. The probe exits non-zero
   * and names the failed assertion, so `execFileSync` throws and this test goes
   * red with the reason in the message. A probe that merely ran would be one of
   * the blind lights this repository has found seventeen of.
   */
  it("draws both tiers, draws NOTHING for an unchecked person, and carries no background", () => {
    const probe = fileURLToPath(new URL("../../../../../scripts/probes/badge_mark_dom.mjs", import.meta.url));
    const verdict = execFileSync(process.execPath, [probe], { encoding: "utf8" });
    expect(verdict).toContain("BADGE DOM PROBE PASS");
    expect(verdict).toContain("renders NOTHING for an unchecked person");
    expect(verdict).toContain("neither borrowing the other's paint");
    expect(verdict).toContain("no background, border, plate, shadow, disc or rect behind either");
  });
});

describe("the migration that carries the tier says only what it is allowed to say", () => {
  function body(): string {
    return readFileSync(TIER_MIGRATION, "utf8")
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
  }

  it("earns gold off a passed rung and never off an approval", () => {
    /*
     * `is_checked_person` may read the two PUBLISHED derived columns and
     * nothing else. An approval word appearing anywhere inside it would be the
     * original defect rewritten in SQL.
     */
    const fn = /create or replace function public\.is_checked_person[\s\S]*?\$\$;/.exec(body());
    expect(fn).not.toBeNull();
    expect(fn?.[0]).toContain("ab.verified");
    expect(fn?.[0]).toContain("b.verified");
    expect(fn?.[0]).not.toMatch(/status/);
    expect(fn?.[0]).not.toMatch(/APPROVED/);
    expect(fn?.[0]).not.toMatch(/verification_tier/);
  });

  it("takes platinum from the role that already decides who is staff", () => {
    const fn = /create or replace function public\.is_platform_staff[\s\S]*?\$\$;/.exec(body());
    expect(fn).not.toBeNull();
    expect(fn?.[0]).toContain("private.has_role(check_user_id, 'admin'::app_role)");
    expect(fn?.[0]).toContain("private.has_role(check_user_id, 'super_admin'::app_role)");
  });

  it("decides the precedence once, in the database, so that no renderer has to", () => {
    const sql = body();
    expect(sql).toContain(
      "create or replace function public.badge_tier(is_staff boolean, is_checked boolean)",
    );
    expect(sql).toMatch(/when coalesce\(is_staff, false\)\s*then 'platinum'/);
    expect(sql).toMatch(/when coalesce\(is_checked, false\)\s*then 'gold'/);
  });

  it("grants the three view helpers deliberately and locks the writer nobody calls", () => {
    /*
     * Rule 21, and the 22 September outage in its second costume. A non-invoker
     * view checks TABLE access as its owner but FUNCTION execute as the
     * QUERYING role, so a stranger must hold EXECUTE on all three helpers or
     * every read of the view raises 42501 and the badge vanishes from every
     * public surface at once. Measured with a rolled-back probe as `anon`, not
     * assumed; the file's header carries the error it produced.
     */
    const sql = body();
    expect(sql).toContain("grant execute on function public.badge_tier(boolean, boolean) to anon, authenticated;");
    expect(sql).toContain("grant execute on function public.is_platform_staff(uuid)      to anon, authenticated;");
    expect(sql).toContain("grant execute on function public.is_checked_person(uuid)      to anon, authenticated;");
    expect(sql).toContain("revoke all on function public.badge_tier(boolean, boolean)  from public;");
    expect(sql).toContain("revoke all on function public.is_platform_staff(uuid)       from public;");
    expect(sql).toContain("revoke all on function public.is_checked_person(uuid)       from public;");
    expect(sql).toContain(
      "revoke execute on function private.refresh_agent_badge_tier(uuid) from public, anon, authenticated;",
    );
    /* And section 65's twin of rule 21, for a view born writable by anon. */
    expect(sql).toContain("revoke all on public.person_badge from public, anon, authenticated;");
    expect(sql).toContain("grant select on public.person_badge to anon, authenticated;");
  });

  it("keeps the published row and the person view from ever disagreeing", () => {
    /*
     * `agent_badges.tier` is a stored copy, so it has exactly one writer and a
     * trigger on every input that can change the answer. Without the two
     * refresh triggers a staff grant or a business verification would leave
     * the stored copy stale, which is two screens disagreeing again.
     */
    const sql = body();
    expect(sql).toContain("create trigger user_roles_refresh_agent_badge_tier");
    expect(sql).toContain("create trigger businesses_refresh_agent_badge_tier");
    expect(sql).toContain("perform private.refresh_agent_badge_tier(new.user_id);");
  });
});
