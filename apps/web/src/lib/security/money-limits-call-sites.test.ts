import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
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

/**
 * DOC-07 / MON-07: WHAT COUNTS AS A GUARD IS READ OFF THE SYNTAX TREE, NOT THE TEXT.
 *
 * This used to be `file.text.includes('guardMoney("<action>"')`, which a
 * comment, a string, dead code or a call whose verdict is thrown away all
 * satisfied, so the light could not go red for the reason it exists. A call
 * site counts only when it is a real call expression with the action as a
 * string literal, AWAITED, bound to a name, and IMMEDIATELY followed by
 * `if (!<name>.allowed) return ...`, and when nothing in the same function
 * that can move money (an RPC, a table write, a Paystack call) runs before it.
 */
type GuardSite = { action: string; file: string; line: number; problems: string[] };

/** The last segment of a callee that writes money state or calls a payment provider. */
const MONEY_MOVERS =
  /(^|\.)(rpc|callMoneyRpc|callRpc|insert|update|upsert|delete|initializeTransaction|chargeAuthorization|createTransferRecipient|initiateTransfer|resolveAccountNumber)$/;

function enclosingFunction(node: ts.Node): ts.FunctionLikeDeclaration | undefined {
  let n: ts.Node | undefined = node.parent;
  while (n && !ts.isFunctionLike(n)) n = n.parent;
  return n as ts.FunctionLikeDeclaration | undefined;
}

function guardSites(path: string, text: string): GuardSite[] {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const sites: GuardSite[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "guardMoney" &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      const problems: string[] = [];
      const awaited = ts.isAwaitExpression(node.parent) ? node.parent : undefined;
      if (!awaited) problems.push("not awaited");
      const decl = awaited && ts.isVariableDeclaration(awaited.parent) ? awaited.parent : undefined;
      const name = decl && ts.isIdentifier(decl.name) ? decl.name.text : undefined;
      if (!name) problems.push("verdict is not bound to a name");
      const statement = decl?.parent?.parent;
      const block = statement?.parent;
      if (name && statement && block && (ts.isBlock(block) || ts.isSourceFile(block))) {
        const next = block.statements[block.statements.indexOf(statement as ts.Statement) + 1];
        const checks =
          next !== undefined &&
          ts.isIfStatement(next) &&
          next.expression.getText(sf).replace(/\s+/g, "") === `!${name}.allowed` &&
          (ts.isReturnStatement(next.thenStatement) ||
            (ts.isBlock(next.thenStatement) && next.thenStatement.statements.some(ts.isReturnStatement)));
        if (!checks) problems.push(`not immediately followed by \`if (!${name}.allowed) return\``);
      } else if (name) {
        problems.push("verdict is not a statement in a block");
      }
      const fn = enclosingFunction(node);
      if (fn?.body) {
        const before: string[] = [];
        const scan = (n: ts.Node): void => {
          if (n.getStart(sf) >= node.getStart(sf)) return;
          if (ts.isCallExpression(n)) {
            const callee = n.expression.getText(sf);
            if (MONEY_MOVERS.test(callee)) before.push(callee);
          }
          ts.forEachChild(n, scan);
        };
        ts.forEachChild(fn.body, scan);
        if (before.length > 0) problems.push(`runs after ${before.join(", ")}`);
      }
      sites.push({
        action: node.arguments[0].text,
        file: path,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        problems,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return sites;
}

const SITES = CALLERS.flatMap((file) => guardSites(file.path, file.text));

describe("the call-site reader sees only guards that guard", () => {
  const read = (body: string) => guardSites("fixture.ts", body);
  const good = `async function a(){ const s = await resolveSession(); const limit = await guardMoney("withdraw", s.id); if (!limit.allowed) return fail(limit.message); await admin.rpc("x"); }`;

  it("counts a real, awaited, checked guard that runs before the money moves", () => {
    expect(read(good)).toEqual([expect.objectContaining({ action: "withdraw", problems: [] })]);
  });

  it("does not count a guard that exists only in a comment or a string", () => {
    expect(read(`// guardMoney("withdraw", id)\nconst s = 'guardMoney("withdraw"';`)).toEqual([]);
  });

  it("flags a guard whose verdict is ignored, unawaited, or checked late", () => {
    expect(read(`async function a(){ await guardMoney("withdraw", id); }`)[0]?.problems.join()).toMatch(/not bound/);
    expect(read(`function a(){ const l = guardMoney("withdraw", id); if (!l.allowed) return; }`)[0]?.problems.join()).toMatch(/not awaited/);
    expect(read(`async function a(){ const l = await guardMoney("withdraw", id); log(l); if (!l.allowed) return; }`)[0]?.problems.join()).toMatch(/immediately followed/);
  });

  it("flags a guard that runs after the money has moved", () => {
    const late = `async function a(){ await admin.rpc("transfer_between_wallets"); const limit = await guardMoney("withdraw", id); if (!limit.allowed) return fail(); }`;
    expect(read(late)[0]?.problems.join()).toMatch(/runs after admin\.rpc/);
  });
});

describe("every money action is guarded where it is spent", () => {
  it("finds a real guardMoney call site for every action in the table", () => {
    const actions = Object.keys(MONEY_LIMITS) as MoneyAction[];
    const unguarded = actions.filter((action) => !SITES.some((site) => site.action === action));
    expect(unguarded).toEqual([]);
  });

  it("every guardMoney call site is awaited, checked at once, and runs before any money moves", () => {
    const bad = SITES.filter((site) => site.problems.length > 0).map(
      (site) => `${site.file.slice(SRC.length)}:${site.line} ${site.action}: ${site.problems.join("; ")}`,
    );
    expect(bad).toEqual([]);
    expect(SITES.length).toBeGreaterThanOrEqual(Object.keys(MONEY_LIMITS).length);
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
