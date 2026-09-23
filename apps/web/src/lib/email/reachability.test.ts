import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { OUTBOX_TEMPLATE_KEYS } from "@/lib/notify/templates";

/**
 * THE COUNT OF BUILT-AND-UNREACHABLE EMAIL BUILDERS, HELD AT ZERO.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS EXISTS BECAUSE OF.
 *
 * Nine builders in this directory sat complete, correct, rendered in the
 * fixtures and covered by their own unit tests, with NO CALLER, for weeks. The
 * whole suite was green the entire time. Every test in `messages.test.ts` and
 * `shell.test.ts` asks whether a builder EXISTS and whether its words are
 * right. Not one of them could ask whether a person would ever receive it,
 * because that is a question about the rest of the repository and those files
 * only read themselves.
 *
 * So this file asks the other question, once, for every builder there is.
 *
 * ---------------------------------------------------------------------------
 * HOW IT ASKS IT, AND WHY THIS SHAPE RATHER THAN A COUNT.
 *
 * A count would say "nothing is unreachable" and go green the day somebody
 * added a builder and a refusal in the same commit. So there is no count here.
 * There are two SETS and they are asserted EQUAL:
 *
 *   what the repository can actually reach, computed by walking every
 *   non-test module outside this directory, finding the ones that name a
 *   builder, and keeping only those that can actually send: they call
 *   `sendMessage`, `sendEmail` or `announce`, or they are the outbox registry
 *   itself;
 *
 *   and what is DELIBERATELY not wired, written out below with the reason.
 *
 * Both directions fail. A builder that loses its last caller is not on the
 * refusal list, so the suite goes red with its name in the message. A builder
 * on the refusal list that somebody quietly wires is also red, because a
 * refusal that has stopped being true is a lie sitting in a comment.
 *
 * ---------------------------------------------------------------------------
 * ONE THING THIS FILE CANNOT SEE, SAID HERE RATHER THAN LEFT OUT.
 *
 * `verificationCode` passes the check below: `app/api/auth/email-hook/route.ts`
 * names it and sends it. THAT ROUTE IS NOT THE LIVE PATH. Supabase's Send
 * Email Hook is not enabled on the hosted project and
 * `SUPABASE_AUTH_HOOK_SECRET` is not set, both measured in `docs/email/AUTH_EMAILS.md`
 * section 1A off GoTrue's own `mail.send` events. So the code is reachable and
 * the deployment is not, and no test running in this repository can tell the
 * difference. It is recorded as UNPROVEN in `docs/email/WHAT_SENDS.md` with
 * what is missing, and that is the honest place for it.
 */

const here = fileURLToPath(new URL(".", import.meta.url));
const SRC = path.resolve(here, "..", "..");

/** The files that declare a message builder, and are therefore not callers. */
const DECLARING = [
  "lib/email/messages.ts",
  "lib/email/escrow-messages.ts",
  "lib/email/payment-instrument-messages.ts",
  "lib/email/welcome-message.ts",
  "lib/account-deletion/emails.ts",
];

/**
 * The fixtures render every builder by name and send none of them.
 *
 * Excluded explicitly rather than by accident, because it is precisely the
 * file whose presence made nine dead builders look alive: being in the
 * fixtures is what a reader mistook for being wired.
 */
const NOT_A_CALLER = new Set([
  "lib/email/fixtures.ts",
  ...DECLARING,
]);

/**
 * A function that returns a message somebody reads.
 *
 * FOUR RETURN TYPES AND NOT ONE, WHICH IS A TRAP THIS FILE ALREADY FELL INTO.
 * The first version of this sweep matched `EmailMessage` alone and therefore
 * could not see the eight escrow builders, which return `EscrowEmail`. It went
 * green over a third of the catalogue it was not looking at, which is the
 * exact failure it exists to prevent, one level up. `EVERY_RETURN_TYPE` below
 * is the guard against it happening again.
 */
const BUILDER_RE =
  /export function (\w+)\s*\([^)]*\)\s*:\s*(?:EmailMessage|EscrowEmail|PaymentInstrumentEmail|DeletionEmail)\b/g;

/** Every exported function in those files, whatever it answers with. */
const EXPORT_RE = /export function (\w+)\s*\([^)]*\)\s*:\s*([\w<>[\]| ]+?)\s*\{/g;

/**
 * Every type an exported function in the email layer is allowed to return.
 *
 * A builder that answered with a fifth type would be invisible to
 * `BUILDER_RE`, so this list is asserted to cover the files exhaustively. Add
 * a type here and you must add it to `BUILDER_RE` too, or say why it is not a
 * message.
 */
const EVERY_RETURN_TYPE = new Set([
  "EmailMessage",
  "EscrowEmail",
  "PaymentInstrumentEmail",
  "DeletionEmail",
  /* `cardPhrase`: "Visa ending 4242". A phrase inside a message, not one. */
  "string",
]);

/** A module that can put something on the wire, or the registry that does. */
function canSend(source: string, relative: string): boolean {
  if (relative === "lib/notify/templates.ts") return true;
  return /\b(sendMessage|sendEmail|announce)\s*\(/.test(source);
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

/**
 * EVERY BUILDER THAT MUST NOT BE WIRED, AND WHY, IN WORDS A PERSON CAN ACT ON.
 *
 * A reason here is the decision itself, not a label. If one of these ever
 * stops being true, the fix is to wire the builder and delete the entry, in
 * that order.
 */
const REFUSED: Record<string, string> = {
  passwordReset:
    "GoTrue owns it. `resetPasswordForEmail` mints the recovery token inside " +
    "GoTrue and sends its own mail; the token never reaches this process, so " +
    "ours would be a SECOND email with no working link, arriving beside the " +
    "real one on the one screen where somebody is already locked out.",

  escrowFunded:
    "It prints 'held in escrow', the claim about custody nobody may make " +
    "until the solicitor answers on the structure. Rule 11: escrow is " +
    "promised nowhere until it operates. Superseded by heldPaymentSetAside, " +
    "which the outbox sends on every HELD transition to both parties.",

  withdrawalFailed:
    "Superseded by withdrawalOutcome, and removed from three call sites on " +
    "23 September rather than left to agree with it. All three performed the " +
    "same UPDATE of `wallet_entries.status` that fires " +
    "`wallet_entries_enqueue_withdrawal_email`, so one failed withdrawal was " +
    "TWO emails about the same money, and the two disagreed: the queued one " +
    "tells `reversed` apart from `failed`, which is the difference between " +
    "money that never left and money that left and came back. Two senders " +
    "for one event is the defect; matching their wording would only hide it.",

  escrowReleased:
    "Same custody claim in its subject line, same rule 11. Superseded by " +
    "heldPaymentPaidOut, which the outbox sends on every RELEASED transition " +
    "to both parties, with the settlement lines rather than a bare amount.",
};

describe("no email builder is built and unreachable", () => {
  it("every builder either has a path to the wire or a written refusal", async () => {
    const declared = new Map<string, string>();
    for (const relative of DECLARING) {
      const source = await readFile(path.join(SRC, relative), "utf8");
      for (const match of source.matchAll(BUILDER_RE)) {
        const name = match[1];
        if (name) declared.set(name, relative);
      }

      /* NOTHING IN THESE FILES IS ALLOWED TO BE INVISIBLE TO THE SWEEP. A
         builder introduced with a new return type would otherwise be
         unreachable and unnoticed, which is the whole defect. */
      for (const match of source.matchAll(EXPORT_RE)) {
        const [, name, returns] = match;
        expect(
          EVERY_RETURN_TYPE.has((returns ?? "").trim()),
          `${relative}: ${name} returns ${returns}, which this sweep cannot see`,
        ).toBe(true);
      }
    }

    /* If the regex ever stops finding builders, this whole file would pass on
       an empty set, which is the classic way a sweep like this goes blind.
       Thirty eight is the count on 23 September and it only ever grows. */
    expect(declared.size).toBeGreaterThanOrEqual(38);

    const files = await walk(SRC);
    const reached = new Set<string>();
    for (const full of files) {
      const relative = path.relative(SRC, full).split(path.sep).join("/");
      if (NOT_A_CALLER.has(relative)) continue;
      const source = await readFile(full, "utf8");
      if (!canSend(source, relative)) continue;
      for (const name of declared.keys()) {
        if (new RegExp(`\\b${name}\\s*\\(`).test(source)) reached.add(name);
      }
    }

    const unreached = [...declared.keys()].filter((name) => !reached.has(name)).sort();

    /* NAMED, NOT COUNTED. A mismatch in either direction prints the builders. */
    expect(unreached).toEqual(Object.keys(REFUSED).sort());

    for (const [name, reason] of Object.entries(REFUSED)) {
      expect(declared.has(name), `${name} is refused but no longer exists`).toBe(true);
      /* A refusal that is a label rather than a decision is not a refusal. */
      expect(reason.length, name).toBeGreaterThan(60);
    }
  });

  /**
   * THE OTHER HALF OF REACHABLE, FOR THE BUILDERS THE OUTBOX SENDS.
   *
   * A registry entry is only reached if a trigger writes its key. The registry
   * could be complete and correct and every key dead, which is exactly the
   * state the whole junction was built to end. `templates.test.ts` holds the
   * keys against a list written by hand; this one holds them against the
   * migrations themselves, so a trigger renamed in SQL is caught here.
   */
  it("every outbox template key is written by a migration", async () => {
    const dir = path.resolve(SRC, "..", "..", "..", "supabase", "migrations");
    const names = (await readdir(dir)).filter((name) => name.endsWith(".sql"));
    expect(names.length).toBeGreaterThan(50);

    const all = (
      await Promise.all(names.map((name) => readFile(path.join(dir, name), "utf8")))
    ).join("\n");

    const missing = OUTBOX_TEMPLATE_KEYS.filter((key) => {
      /* `escrow.<STATE>` is composed from the enum label at run time, so the
         migration carries the prefix and the state list rather than the key. */
      if (key.startsWith("escrow.")) {
        const state = key.slice("escrow.".length);
        return !(all.includes("'escrow.'") && all.includes(`'${state}'`));
      }
      return !all.includes(`'${key}'`);
    });

    expect(missing).toEqual([]);
  });
});
