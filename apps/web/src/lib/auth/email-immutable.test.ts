import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * AN EMAIL ADDRESS IS PERMANENT ON THIS PLATFORM, AND THIS IS THE CHECK.
 *
 * The founder ruled on 23 September that an account's address can never be
 * changed. It is not a preference. Two things depend on it:
 *
 *  - `public.account_identities` records which underlying mailbox an account
 *    belongs to, AT CREATION, because accounts cannot be merged or corrected
 *    afterwards. A link that can be rewritten is not a link.
 *  - The address is how a person is reached about money and about their own
 *    account, so a change is the single most valuable takeover a stolen
 *    session could perform.
 *
 * This file is a SOURCE SWEEP rather than a unit test on purpose. The failure
 * it exists to catch is somebody adding a new caller, in a file nobody thought
 * to test, six weeks from now. A sweep sees files that do not exist yet.
 *
 * THE ONE LEGITIMATE WRITE, named rather than pattern-matched away: `scrubAuth`
 * in `lib/account-deletion/service.ts` replaces the address with a
 * `deleted.invalid` pseudonym during a purge. That is ERASURE, not a change. It
 * runs as the service role inside a job, and nothing signed in can reach it.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The single file allowed to write an email onto an auth row, and why. */
const ERASURE_ONLY = "lib/account-deletion/service.ts";

/**
 * SEC-15: the staff-assisted recovery. It writes a NEW address, but only a
 * super admin can reach it and only after the database has matched the NIN on
 * file and let 72 hours pass (`admin_begin_email_recovery`). It is not
 * reachable by the account's owner. `staff-recovery.test` below pins the
 * gates in the file itself.
 */
const STAFF_RECOVERY = "lib/admin/email-recovery-actions.ts";

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sources(full, out);
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FILES = sources(SRC);

describe("nothing changes an email address", () => {
  it("sweeps a real tree, so an empty sweep cannot pass as coverage", () => {
    expect(FILES.length).toBeGreaterThan(300);
    expect(FILES.some((f) => f.endsWith(join("lib", "auth", "actions.ts")))).toBe(true);
  });

  /**
   * Every `updateUser` / `updateUserById` call, with the object literal that
   * follows it, and whether that literal names `email`. Deliberately crude:
   * a regex that over-reports is a conversation, and one that under-reports is
   * the hole this file exists to close.
   */
  it("has exactly two callers that write an email onto an auth row: the purge and staff recovery", () => {
    const writers: string[] = [];
    for (const file of FILES) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/updateUser(?:ById)?\s*\(/g)) {
        /* From the call site to the end of its argument list, found by
           counting brackets rather than by a terminator pattern, because a
           pattern that misses a call fails OPEN and this check must not. */
        let depth = 0;
        let end = match.index + match[0].length;
        for (; end < text.length; end += 1) {
          const ch = text[end];
          if (ch === "(") depth += 1;
          else if (ch === ")") {
            if (depth === 0) break;
            depth -= 1;
          }
        }
        const args = text.slice(match.index, end);
        if (/(^|[\s{,])email\s*:/.test(args)) {
          writers.push(relative(SRC, file).split("\\").join("/"));
        }
      }
    }
    expect([...new Set(writers)].sort()).toEqual([ERASURE_ONLY, STAFF_RECOVERY].sort());
  });

  /**
   * The other half, and it is the one that matters against a token minted
   * outside the product. `verifyOtp` is handed a type; if `email_change` is in
   * the accepted set then a link from a change we never initiated would still
   * be redeemed by our own confirm screen.
   */
  it("does not accept an email_change token at the confirm screen", () => {
    const actions = readFileSync(join(SRC, "lib", "auth", "actions.ts"), "utf8");
    const allowlist = actions.match(/const type = \[([^\]]*)\]/);
    expect(allowlist, "the verifyOtp type allowlist moved; this check must move with it").not.toBeNull();
    expect(allowlist?.[1]).not.toContain("email_change");
    /* And the ones that must still work, so this cannot pass by the allowlist
       having been emptied or renamed into nothing. */
    expect(allowlist?.[1]).toContain("recovery");
    expect(allowlist?.[1]).toContain("signup");
  });

  /**
   * No server action offers an email field to a signed-in person. `updateUser`
   * acts on whoever the cookies say is signed in, so a form field reaching it
   * is the whole vulnerability in one line.
   */
  it("has no signed-in path that passes a user-supplied address to updateUser", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const text = readFileSync(file, "utf8");
      if (!/auth\.updateUser\s*\(/.test(text)) continue;
      for (const match of text.matchAll(/auth\.updateUser\s*\(([\s\S]{0,300}?)\)/g)) {
        if (/email/.test(match[1] ?? "")) offenders.push(relative(SRC, file).split("\\").join("/"));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the staff recovery path cannot be self-service", () => {
  const source = readFileSync(join(SRC, STAFF_RECOVERY), "utf8");

  it("checks for a super admin before the database is asked anything", () => {
    for (const action of ["openEmailRecovery", "completeEmailRecovery"]) {
      const body = source.slice(source.indexOf(`export async function ${action}`));
      const guard = body.indexOf("if (!access.isSuperAdmin)");
      const rpc = body.indexOf(".rpc(");
      expect(guard, `${action} checks isSuperAdmin`).toBeGreaterThan(-1);
      expect(guard, `${action} checks before its first call`).toBeLessThan(rpc);
    }
  });

  it("changes the address only after admin_begin_email_recovery has cleared the request", () => {
    const begin = source.indexOf('"admin_begin_email_recovery"');
    const write = source.indexOf("updateUserById(");
    expect(begin).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(begin);
    expect(source.indexOf('"admin_finish_email_recovery"')).toBeGreaterThan(write);
  });
});

