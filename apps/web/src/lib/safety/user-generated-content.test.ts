import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REPORT_TARGETS } from "@/lib/reports/schema";
import { EULA_ZERO_TOLERANCE } from "@/lib/legal/eula-copy";
import { BLOCK_CONFIRM_COPY } from "@/lib/safety/blocks-copy";
import { withoutComments } from "@/lib/copy/source-scan";
import {
  TERMS_NOT_ACCEPTED_MESSAGE,
  termsAccepted,
  termsRefusal,
} from "@/lib/auth/terms-gate";
import { TERMS_VERSION } from "@/lib/legal/versions";

/**
 * The seams the acceptance writer reaches through, replaced so the receipt
 * below is a real call with real arguments rather than a string in a file.
 * Nothing else in this file imports either module.
 */
const seam = vi.hoisted(() => ({ upsert: vi.fn(), alert: vi.fn() }));

vi.mock("@/lib/alerts", () => ({ recordAlert: seam.alert }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ upsert: seam.upsert }) }),
}));

beforeEach(() => {
  seam.upsert.mockReset();
  seam.alert.mockReset();
  seam.upsert.mockResolvedValue({ error: null });
  seam.alert.mockResolvedValue({ ok: true });
});

/**
 * THE FOUR PRECAUTIONS, GUARDED SO THEY CANNOT QUIETLY COME BACK OUT.
 *
 * Apple guideline 1.2 asks, in its published text (fetched from
 * developer.apple.com and quoted in `docs/research/STORE_REJECTION_RISK_RESEARCH.md`),
 * for four things from an application with user generated content:
 *
 *   - "A method for filtering objectionable material from being posted to the app"
 *   - "A mechanism to report offensive content and timely responses to concerns"
 *   - "The ability to block abusive users from the service"
 *   - "Published contact information so users can easily reach you"
 *
 * Three of those four were missing or incomplete on direct messaging, which is
 * also the place on a property marketplace where a person is most likely to
 * need them. These are source assertions rather than renders, for the same
 * reason the example-listing disclosure is guarded by source: what has to hold
 * is not what the sheet looks like once, it is that the controls cannot be
 * removed, renamed or put behind a feature flag without a test going red.
 */

const ROOT = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/**
 * A source file with its prose taken out, which is the only form any source
 * assertion in this file may be made against.
 *
 * WHY, IN ONE SENTENCE: the assertion this replaced was satisfied by a
 * comment. See "an acceptance is recorded, not merely announced" below.
 */
const code = (p: string) => withoutComments(read(p));

describe("reporting reaches a conversation", () => {
  it("accepts a conversation and a message as report targets", () => {
    expect(REPORT_TARGETS).toContain("conversation");
    expect(REPORT_TARGETS).toContain("message");
    expect(REPORT_TARGETS).toContain("listing");
  });

  it("mounts a report control inside the conversation options sheet", () => {
    const sheet = read("app/(app)/messages/[id]/ThreadOptionsSheet.tsx");
    expect(sheet).toContain("ReportSheet");
    expect(sheet).toContain('targetType="conversation"');
  });

  it("does not name a listing in the report sheet's own copy", () => {
    // The sheet is generic now. A retyped noun is how it starts telling a
    // person reporting a conversation that they are reporting a listing.
    const sheet = read("components/app/ReportSheet.tsx");
    expect(sheet).not.toContain("Report this listing");
    expect(sheet).not.toContain("Back to the listing");
    expect(sheet).toContain("REPORT_TARGET_NOUN");
  });
});

describe("blocking reaches a conversation", () => {
  it("offers a block control in the conversation options sheet", () => {
    const sheet = read("app/(app)/messages/[id]/ThreadOptionsSheet.tsx");
    expect(sheet).toContain("thread-block-opener");
    expect(sheet).toContain("blockUserSafely");
  });

  it("does not put a safety control behind the social feature flag", () => {
    // The whole reason the implementation moved out of posts-actions.ts. A
    // person harassed in a listing conversation must not be told that a
    // DIFFERENT feature is switched off.
    const actions = read("lib/safety/blocks-actions.ts");
    // The doc comment QUOTES the old guard, deliberately, so the reason the
    // file exists is readable. What must not be here is the import that would
    // let the guard come back, or a call to it in the body.
    expect(actions).not.toContain('from "../social/flag"');
    expect(actions).not.toMatch(/^\s*if \(!\(await isSocialEnabled\(\)\)\)/m);
  });

  it("says what a block does before it is done", () => {
    expect(BLOCK_CONFIRM_COPY).toContain("They are not told");
    expect(BLOCK_CONFIRM_COPY).toContain("Settings, Privacy");
  });
});

describe("the agreement exists and is accepted rather than announced", () => {
  it("carries the zero tolerance clause and the twenty four hour commitment", () => {
    expect(EULA_ZERO_TOLERANCE).toContain("no tolerance for objectionable content");
    expect(EULA_ZERO_TOLERANCE).toContain("within 24 hours");
    // The document quotes the constant rather than retyping the clause, so the
    // page and the promise cannot drift apart.
    const doc = read("lib/legal/eula.tsx");
    expect(doc).toContain("{EULA_ZERO_TOLERANCE}");
  });

  it("is published at a route a signed out person can reach", () => {
    const page = read("app/(site)/eula/page.tsx");
    expect(page).toContain("EULA_SECTIONS");
    const proxy = read("proxy.ts");
    // (site) routes are public unless they are named in the protected set.
    expect(proxy).not.toContain('"eula"');
  });

  /*
   * THIS TEST WAS A MIRROR TWICE, AND IT IS NOW A BEHAVIOUR.
   *
   * Version one asserted `EmailAuthForm.tsx` contains the string
   * `setAcceptError(true)`. It would have passed with the submit never
   * stopped, and the comment above the rule in `lib/auth/actions.ts` says so.
   *
   * Version two, which replaced it, asserted the same file contains the
   * literal `{!isSignUp && <p className="nf-auth__terms">`. That is markup.
   * It went red on 22 September when another session legitimately rewrote the
   * component, having never once exercised the rule it was guarding, and it
   * would have stayed green if somebody kept the JSX and deleted the server
   * gate. The most serious safety property on this platform was being
   * defended by a string match on a JSX attribute.
   *
   * The rule now lives in `lib/auth/terms-gate.ts` as a pure function,
   * precisely so this test can CALL it rather than read it. `actions.ts` is
   * `"use server"` and may export nothing that is not an async function,
   * which is why it could not be reached before.
   */
  it("refuses a sign up that carries no agreement, a stale one, or a blank one", () => {
    // The real thing: a current version is the only thing that passes.
    expect(termsAccepted(TERMS_VERSION)).toBe(true);
    expect(termsRefusal(TERMS_VERSION)).toBeNull();

    // Assembled by hand, or a browser running no script: no field at all.
    expect(termsAccepted(undefined)).toBe(false);
    expect(termsAccepted(null)).toBe(false);
    expect(termsAccepted("")).toBe(false);
    expect(termsAccepted("   ")).toBe(false);

    // A STALE VERSION IS REFUSED TOO. Somebody sitting on a form opened before
    // the documents changed has not agreed to the documents we would record.
    expect(termsAccepted("1999-01-01")).toBe(false);
    expect(termsAccepted(`${TERMS_VERSION}-old`)).toBe(false);

    // And the refusal is a sentence a person can act on, not a code.
    expect(termsRefusal(null)).toBe(TERMS_NOT_ACCEPTED_MESSAGE);
    expect(TERMS_NOT_ACCEPTED_MESSAGE).toMatch(/tick the box/i);
  });

  /* The form must still OFFER the tick. This one assertion is deliberately
     about the component, because "the server refuses without it" and "a person
     is given a way to give it" are two different facts and the second cannot
     be proved by calling a function. It checks the import, not the markup, so
     a rewrite of the JSX does not fail it. */
  it("gives a person signing up the tick to give", () => {
    const form = read("components/auth/EmailAuthForm.tsx");
    expect(form).toContain("AcceptTerms");
  });

});

/**
 * AN ACCEPTANCE IS RECORDED, NOT MERELY ANNOUNCED.
 *
 * WHAT USED TO BE HERE, AND WHY IT WAS WORTHLESS. One assertion,
 * `expect(read("lib/auth/actions.ts")).toContain("terms_version")`, stood for
 * the whole of this. It was green for weeks. The string it matched was
 * `terms_version:` in the auth metadata object, a field written into
 * `auth.users.raw_user_meta_data` and read by nothing: there is no
 * `profiles.terms_version` column and `handle_new_user` has never mentioned
 * terms. Not one acceptance was recorded for any account on this platform
 * while that test was green.
 *
 * It was worse than it looks. `read` returns the file WITH its comments, and
 * the block above the metadata field discusses `terms_version` at length, so
 * the assertion would have gone on passing with every line of the receipt
 * deleted, on the prose about the receipt alone.
 *
 * So the claim is now made where it can be proved. The receipt is a real call
 * with real arguments against a replaced writer, which is the only thing that
 * can say WHAT is recorded. The two halves that cannot be reached from a node
 * test, the field the form submits and the call the sign-up action makes, are
 * asserted against source with its prose stripped, and are named for what they
 * are rather than for what the receipt would be.
 *
 * WHAT IS STILL NOT PROVED HERE, SAID PLAINLY: that `public.terms_acceptances`
 * exists in the database this build talks to. A node test cannot know that,
 * and it is exactly the gap the original defect fell through. It is held by
 * the migration's own probe and by the alert the writer raises when the upsert
 * is refused, which is asserted in `lib/legal/acceptance.test.ts`.
 */
describe("an acceptance is recorded, not merely announced", () => {
  it("writes a receipt for both documents at the versions this build serves", async () => {
    const { recordTermsAcceptance } = await import("@/lib/legal/acceptance");
    const { TERMS_VERSION, PRIVACY_VERSION } = await import("@/lib/legal/versions");
    const userId = "11111111-1111-4111-8111-111111111111";

    await recordTermsAcceptance(userId, "signup_email");

    expect(seam.upsert).toHaveBeenCalledTimes(1);
    const [rows] = seam.upsert.mock.calls[0] as [
      { user_id: string; document: string; version: string; source: string }[],
    ];
    expect(rows.map((row) => row.document).sort()).toEqual(["privacy", "terms"]);
    expect(rows.find((row) => row.document === "terms")?.version).toBe(TERMS_VERSION);
    expect(rows.find((row) => row.document === "privacy")?.version).toBe(PRIVACY_VERSION);
    expect(rows.every((row) => row.user_id === userId)).toBe(true);
  });

  it("says so on the desk when the receipt cannot be written, rather than losing it", async () => {
    /*
     * The half that makes the gap above survivable. A missing compliance
     * record nobody knows is missing is the worst of the outcomes, so the
     * failure the original defect had, a write that went nowhere, is now
     * loud even though the write still cannot be proved from here.
     */
    seam.upsert.mockResolvedValue({ error: { message: "relation does not exist" } });
    const { recordTermsAcceptance } = await import("@/lib/legal/acceptance");

    await recordTermsAcceptance("11111111-1111-4111-8111-111111111111", "signup_email");

    expect(seam.alert).toHaveBeenCalledTimes(1);
    const [raised] = seam.alert.mock.calls[0] as [{ kind: string }];
    expect(raised.kind).toBe("legal.acceptance.unrecorded");
  });

  it("is asked for by the sign-up action, and only at the version that was served", () => {
    /*
     * Source, with the prose stripped, and named as the call site check it is.
     * It would miss a call that is unreachable, and it would not notice the
     * table going away. It catches the edit that deletes the receipt, which is
     * the edit that has already been made here once.
     */
    const actions = code("lib/auth/actions.ts");
    expect(actions).toMatch(/await recordTermsAcceptance\(\s*data\.user\.id/);
    expect(actions).toContain("submitted === TERMS_VERSION");
    /* And the metadata field is not evidence of anything. If it is ever the
       only mention of terms left in this file, the two assertions above have
       already failed and this one says why. */
    expect(actions).toMatch(/recordTermsAcceptance/);
  });

  it("submits the version the tick box was showing", () => {
    const accept = code("components/auth/AcceptTerms.tsx");
    expect(accept).toContain("TERMS_VERSION");
    expect(accept).toContain('name="termsVersion"');
  });
});

describe("the filter knows abuse as well as fraud", () => {
  const migration = readFileSync(
    join(
      ROOT,
      "..",
      "..",
      "..",
      "supabase",
      "migrations",
      "20260922140000_a_post_is_scanned_for_abuse_as_well_as_fraud.sql",
    ),
    "utf8",
  );

  /** The migration with its commentary taken out, which is the half that runs. */
  const body = migration
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");

  /** The executable body of one function this migration creates. */
  function functionBody(name: string): string {
    const start = body.indexOf(`create or replace function ${name}`);
    expect(start, `${name} is created by this migration`).toBeGreaterThan(-1);
    const rest = body.slice(start);
    const end = rest.indexOf("$$;");
    return end === -1 ? rest : rest.slice(0, end);
  }

  it("adds an objectionable content branch to both scanners, and both CALL it", () => {
    /*
     * Named and called, which are two facts and used to be one. The three
     * assertions this replaced were satisfied by a migration that declares
     * `objectionable_pattern` and two scanners that never ask it anything,
     * which is a filter that exists and does not run.
     */
    expect(body).toContain("create or replace function private.objectionable_pattern()");
    for (const scanner of ["private.scan_post()", "private.scan_social_profile()"]) {
      expect(functionBody(scanner), `${scanner} asks the pattern`).toContain(
        "private.objectionable_pattern()",
      );
    }
  });

  it("is born locked", () => {
    // Rule 21. Every SECURITY DEFINER function revokes EXECUTE from the two
    // client roles in the same migration that creates it.
    for (const fn of [
      "private.objectionable_pattern()",
      "private.scan_post()",
      "private.scan_social_profile()",
    ]) {
      expect(migration).toContain(`revoke all on function ${fn} from public, anon, authenticated`);
    }
    expect(migration).toContain("alter table public.blocked_terms enable row level security");
  });

  it("ships the term list empty, and the emptiness is in the SQL and not only the comment", () => {
    /*
     * The assertion on `-- SEED REQUIRED` is kept because the note is what a
     * reader needs, but it is a COMMENT and proves nothing about the table.
     * What proves it is that the executable half inserts no term at all.
     */
    expect(migration).toContain("-- SEED REQUIRED");
    expect(body).not.toMatch(/insert\s+into\s+public\.blocked_terms/i);
    expect(migration).not.toMatch(/insert into public\.blocked_terms \(term, severity\) values \('[a-z]/);
  });
});
