import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { MONEY_LIMITS, type MoneyAction } from "./money-limits";

/**
 * THE TABLE IS NOT THE GUARD. THE CALL SITE IS.
 *
 * `money-limits.test.ts` proves that every row of the table reaches its own
 * bucket with its own numbers when it is asked. It cannot prove that anything
 * ASKS. A money action with a beautifully written row and no `guardMoney` line
 * in its body is unlimited, and it reads as limited to everybody who opens
 * this file: the same shape as the lint rule that was named in three documents
 * and had never been written, and the same shape as the alerting that was
 * "wired" to a log line nobody read.
 *
 * So this walks the source tree and holds two facts that no unit test on a
 * pure function can reach:
 *
 *   1. EVERY action in `MoneyAction` is guarded at a real call site, in a file
 *      that is not this table and is not a test.
 *   2. EVERY `withIdempotency` call in the tree passes `shouldRecord`, so a
 *      refusal is never recorded as the remembered answer. Without it the
 *      guard's default is "remember everything", and the first tap's
 *      rate-limit refusal would be replayed to the person for the whole TTL as
 *      though it were the outcome of their payment. A refusal must stay
 *      retryable; only an `ok` answer is worth replaying.
 *
 * It reads files rather than importing them, deliberately: importing a money
 * action pulls in a session, a feature flag and a Supabase client, and the
 * question here is about the text of the code, not its behaviour.
 */

const SRC = fileURLToPath(new URL("../..", import.meta.url));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(path, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) continue;
    out.push(path);
  }
  return out;
}

const FILES = sourceFiles(SRC).map((path) => ({ path, text: readFileSync(path, "utf8") }));

/** Everything except the table itself, which names each action by definition. */
const CALLERS = FILES.filter((file) => !file.path.includes("money-limits"));

describe("every money action is guarded where it is spent", () => {
  it("finds a guardMoney call site for every action in the table", () => {
    const actions = Object.keys(MONEY_LIMITS) as MoneyAction[];
    const unguarded = actions.filter(
      (action) => !CALLERS.some((file) => file.text.includes(`guardMoney("${action}"`)),
    );
    expect(unguarded).toEqual([]);
  });

  it("has a source tree to read, so a green result is never an empty walk", () => {
    expect(FILES.length).toBeGreaterThan(200);
    expect(CALLERS.some((file) => file.text.includes("guardMoney("))).toBe(true);
  });
});

describe("a refusal is never remembered as a success", () => {
  it("passes shouldRecord at every withIdempotency call site", () => {
    const callers = CALLERS.filter(
      (file) =>
        !file.path.includes("idempotency") && file.text.includes("withIdempotency<"),
    );
    expect(callers.length).toBeGreaterThan(0);
    for (const file of callers) {
      /* One shouldRecord per opened scope, and every one of them the same
         predicate: only an `ok` envelope is worth replaying. */
      const opened =
        file.text.split("withIdempotency<").length - 1 + (file.text.split("withGuardedIdempotency<").length - 1);
      const recorded = file.text.split("shouldRecord: (result) => result.ok").length - 1;
      expect(recorded, file.path).toBe(opened);
    }
  });
});
