import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPORT_TARGETS } from "@/lib/reports/schema";
import { EULA_ZERO_TOLERANCE } from "@/lib/legal/eula-copy";
import { BLOCK_CONFIRM_COPY } from "@/lib/safety/blocks-copy";

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

  it("blocks sign up until the tick is given", () => {
    const form = read("components/auth/EmailAuthForm.tsx");
    expect(form).toContain("AcceptTerms");
    expect(form).toContain("setAcceptError(true)");
    // The passive notice must not be what a person signing up sees.
    expect(form).toContain("{!isSignUp && <p className=\"nf-auth__terms\">");
  });

  it("records the version that was on screen, not merely that a box was ticked", () => {
    const accept = read("components/auth/AcceptTerms.tsx");
    expect(accept).toContain("TERMS_VERSION");
    expect(accept).toContain('name="termsVersion"');
    const actions = read("lib/auth/actions.ts");
    expect(actions).toContain("terms_version");
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

  it("adds an objectionable content branch to both scanners", () => {
    expect(migration).toContain("private.objectionable_pattern()");
    expect(migration).toContain("create or replace function private.scan_post()");
    expect(migration).toContain("create or replace function private.scan_social_profile()");
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

  it("ships the term list empty and says so", () => {
    expect(migration).toContain("-- SEED REQUIRED");
    expect(migration).not.toMatch(/insert into public\.blocked_terms \(term, severity\) values \('[a-z]/);
  });
});
