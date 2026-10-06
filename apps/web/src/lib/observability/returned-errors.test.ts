import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * D49.3, THE HALF THE CATCH BLOCKS DID NOT COVER: A READ SUPABASE REFUSED BY
 * RETURNING `{ error }`, NOT BY THROWING, IS REPORTED, AND STILL ANSWERS AS IT DID.
 *
 * `silent-reads.test.ts` holds the throwing half. Supabase mostly does not
 * throw: a missing relation, a refused grant or an RLS policy comes back as
 * `{ data: null, error }`, and each read here answered that with its honest
 * empty or unavailable state and told nobody. Every pattern a read uses to
 * branch on a returned error is pinned below on a real read, with a client
 * whose every query RETURNS an error, and then the whole read layer is
 * scanned so no new silent branch can land.
 *
 *   one read, `if (error) return ...`            the notification view, profile badges
 *   one read, `if (error || !data) return ...`   the phone date on the passport
 *   two reads at once, either failing            the passport share state
 *   a ternary, `x.error ? fallback : x.data`     the agreement record's party read
 *   an expected refusal stays quiet              rate limited, not deployed yet (money)
 *   a genuinely empty answer stays quiet
 */

const reported = vi.hoisted(() => [] as { kind: unknown; error: unknown }[]);

vi.mock("@/lib/observability/report", () => ({
  reportError: vi.fn(async (input: { error: unknown; context?: { kind?: unknown } }) => {
    reported.push({ kind: input.context?.kind, error: input.error });
    return { sent: false, reason: "not_configured" };
  }),
}));

type Answer = { data: unknown; error: unknown; count?: number | null };

/** A client whose every query, whatever the chain after `from` or `rpc`, resolves to `answer`. */
function answering(answer: () => Answer): SupabaseClient<Database> {
  const chain: unknown = new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: Answer) => unknown) => resolve(answer());
      }
      return chain;
    },
    apply() {
      return chain;
    },
  });
  /* The client itself is not a promise (an async `createClient` would unwrap it); its queries are. */
  return { from: () => chain, rpc: () => chain, schema: () => ({ from: () => chain, rpc: () => chain }) } as unknown as SupabaseClient<Database>;
}

const REFUSED = { code: "42501", message: "permission denied for table notifications", details: "row (ada@example.com)", hint: null };
let current: SupabaseClient<Database> = answering(() => ({ data: null, error: REFUSED }));

vi.mock("@/lib/actions/session", () => ({
  resolveSession: async () => ({ state: "signed-in", supabase: current, user: { id: "u" } }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => current }));

const ID = "00000000-0000-4000-8000-000000000001";

/** What was reported, as `[kind, code]` pairs. Only code and message leave: never `details` or `hint`. */
const sent = () =>
  reported.map(({ kind, error }) => {
    expect(error, "a returned error is reported as an Error").toBeInstanceOf(Error);
    expect(String((error as Error).message)).not.toContain("ada@example.com");
    return [kind, (error as { code?: unknown }).code ?? null];
  });

beforeEach(() => {
  reported.length = 0;
  current = answering(() => ({ data: null, error: REFUSED }));
});

describe("a read that Supabase refuses by returning { error } is reported, and still answers", () => {
  it("one read, if (error) return: the notification view", async () => {
    const { loadNotificationView } = await import("@/app/(app)/notifications/[id]/load");
    expect(await loadNotificationView(current, ID)).toEqual({ state: "error" });
    expect(sent()).toEqual([["read.notifications.loadNotificationView", "42501"]]);
  });

  it("one read, if (error || !data) return: the profile badges", async () => {
    const { readProfileBadges } = await import("@/components/social/profile/badges-read");
    expect(await readProfileBadges(current, ID, "en")).toBeNull();
    expect(sent()).toEqual([["read.badges.readProfileBadges", "42501"]]);
  });

  it("a read that never looked at its error: the passport's phone date", async () => {
    const { readPhoneConfirmedAt } = await import("@/app/(app)/settings/passport/passport-reads");
    expect(await readPhoneConfirmedAt()).toBeNull();
    expect(sent()).toEqual([["read.passport.readPhoneConfirmedAt", "42501"]]);
  });

  it("two reads at once, either failing: the passport share state", async () => {
    const { readPassportShareState } = await import("@/lib/trust/passport-read");
    expect(await readPassportShareState(ID)).toBeNull();
    expect(sent()).toEqual([
      ["read.passport.readPassportShareState", "42501"],
      ["read.passport.readPassportShareState", "42501"],
    ]);
  });

  it("a ternary fallback: the agreement record's party read", async () => {
    const { readAgreementRecord } = await import("@/components/app/agreements/record-read");
    await readAgreementRecord(ID);
    expect(sent().map(([kind]) => kind)).toContain("read.agreement-record.readAgreementRecord");
  });

  it("an expected refusal stays quiet: a rate-limited record code, a money read not deployed yet", async () => {
    current = answering(() => ({ data: null, error: { code: "P0001", message: "slow down", hint: "rate_limited" } }));
    const { readRecordByCode } = await import("@/lib/trust/record-read");
    expect(await readRecordByCode("ABC123")).toEqual({ state: "limited" });

    current = answering(() => ({ data: null, error: { code: "PGRST202", message: "Could not find the function" } }));
    const { readListerFeePolicy } = await import("@/lib/money/lister-fee-read");
    expect(await readListerFeePolicy({ listingId: ID, propertyType: null, listingIntent: "rent" })).toBeNull();
    expect(sent()).toEqual([]);

    /* ...and the same money read is reported when the fault is anything else. */
    current = answering(() => ({ data: null, error: { code: "42P01", message: "relation does not exist" } }));
    expect(await readListerFeePolicy({ listingId: ID, propertyType: null, listingIntent: "rent" })).toBeNull();
    expect(sent()).toEqual([["read.money.lister_fee_policy", "42P01"]]);
  });

  it("a genuinely empty answer is not reported", async () => {
    current = answering(() => ({ data: null, error: null }));
    const { readPassportShareState } = await import("@/lib/trust/passport-read");
    const { readPhoneConfirmedAt } = await import("@/app/(app)/settings/passport/passport-reads");
    expect(await readPassportShareState(ID)).toEqual({ enabled: false, shared: false });
    expect(await readPhoneConfirmedAt()).toBeNull();
    expect(sent()).toEqual([]);
  });
});

/*
 * THE WHOLE READ LAYER. Every server read file (`queries*.ts`, `*-read.ts`,
 * `*-reads.ts`, a route's `load.ts`) is scanned for a branch on a returned
 * error: `if (...error...) return` / `{`, or `x.error ? ... : ...`. Each error
 * it names must have been handed to `reportReadError` or `reportReadFault`
 * earlier in the same function. A refusal the code expects and says on screen
 * (`42501` read as "approved only", an `instanceof` on a thrown class) is not
 * a fault and is let through by name. On the old tree this listed over ninety
 * silent branches.
 */
const SRC = join(__dirname, "..", "..");
const READ_FILE = /(^queries.*|-reads?|^load)\.ts$/;

function readFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== "node_modules") readFiles(path, out);
    } else if (READ_FILE.test(name) && !name.includes(".test.")) out.push(path);
  }
  return out;
}

const ERR = /\b([A-Za-z_]\w*\.error|[a-z]\w*Error|error)\b(?!\s*instanceof)/g;
const EXPECTED = /\?\.code === "42501"|hint === "rate_limited"|instanceof|reportReadError|reportReadFault|reportError/;
const FUNCTION_START = /^(?:export\s+)?(?:async\s+)?function\s|^(?:export\s+)?const\s+\w+\s*=\s*(?:async|cache\()/;

function silentBranches(): string[] {
  const out: string[] = [];
  for (const file of readFiles(SRC)) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      /* String literals out, so a returned state named "error" is not taken for a variable. */
      const s = line.trim().replace(/"(?:[^"\\]|\\.)*"/g, '""');
      if (s.startsWith("*") || s.startsWith("//")) return;
      const branch = /^if \(/.test(s) && /\)\s*(return\b|\{\s*$)/.test(s) ? s : /\b\w+\.error \?|\berror \?/.test(s) ? s : null;
      if (!branch || EXPECTED.test(line)) return;
      const errors = [...new Set([...branch.matchAll(ERR)].map((m) => m[1]!))].filter(
        (name) => !/Unavailable$/.test(name),
      );
      if (errors.length === 0) return;
      /* The function this line is in, from its start to this line (and, for an `if (...) {`, into its block). */
      let start = i;
      while (start > 0 && !FUNCTION_START.test(lines[start]!)) start--;
      const before = lines.slice(start, i).join("\n");
      const block = /\{\s*$/.test(s) ? lines.slice(i + 1, i + 8).join("\n") : "";
      const reportedNames = [...(before + "\n" + block).matchAll(/report(?:ReadError|ReadFault)\(([^;]*)\);/g)].map((m) => m[1]!);
      const missing = errors.filter(
        (name) => !reportedNames.some((args) => new RegExp(`(^|[\\s,(])${name.replace(".", "\\.")}([\\s,)]|$)`).test(args)),
      );
      if (missing.length) out.push(`${relative(SRC, file)}:${i + 1} ${missing.join(", ")}: ${s.slice(0, 80)}`);
    });
  }
  return out;
}

describe("no read branches on a returned error without reporting it", () => {
  it("finds the read files", () => {
    expect(readFiles(SRC).length).toBeGreaterThan(40);
  });
  it("every branch on a returned error reports that error first", () => {
    expect(silentBranches()).toEqual([]);
  });
});
