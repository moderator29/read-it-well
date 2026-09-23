import "server-only";

import { createClient as createJsClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EXAMPLE_LABEL } from "../listings/syndication";
import { SHELL_START, SHELL_UA_MARK } from "../native/shell";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "../supabase/env";
import {
  abuseFilterCheck,
  deepLinksCheck,
  deleteAccountCheck,
  exampleLabelCheck,
  listingIdsIn,
  nativeStartCheck,
  privacyProcessorsCheck,
  processorsInUse,
  PROCESSORS,
  reportBlockCheck,
  reviewerCheck,
  STORE_CHECK_ORDER,
  versionsCheck,
  type ReviewerEvidence,
  type StoreCheck,
  type StoreCopy,
  type StoreFacts,
} from "./readiness";

/**
 * GATHERING THE EVIDENCE FOR THE STORE DESK (V-52), live.
 *
 * Run on demand when an operator opens the Store tab. Every check reads the
 * platform the way the reviewer will meet it:
 *
 *   our own public pages   fetched over HTTP from the origin this request
 *                          arrived on, WITH NO COOKIES, so a preview checks
 *                          itself and production checks production, and a
 *                          signed-in operator's session cannot turn a
 *                          stranger's 307 into a 200;
 *   the database           through `store_readiness_facts`, a staff-only
 *                          read of counts and booleans (never a term);
 *   the reviewer account   by signing it in, with the credentials the store
 *                          notes carry, on a client that keeps no session,
 *                          and signing that one session straight out again;
 *   the environment        by the PRESENCE of a processor's key, never its
 *                          value.
 *
 * Each gatherer has a short timeout and fails into `null`, which the verdict
 * functions turn into "could not run" with the reason. Nothing here writes to
 * the platform apart from the reviewer's own sign-in session, which it ends.
 */

const TIMEOUT_MS = 6000;

type Fetched = { status: number; text: string; location: string | null };

async function fetchOwn(
  origin: string,
  path: string,
  init: { userAgent?: string; follow?: boolean } = {},
): Promise<Fetched | null> {
  try {
    const response = await fetch(`${origin}${path}`, {
      redirect: init.follow === false ? "manual" : "follow",
      cache: "no-store",
      headers: init.userAgent ? { "user-agent": init.userAgent } : {},
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = init.follow === false ? "" : await response.text();
    return { status: response.status, text, location: response.headers.get("location") };
  } catch {
    return null;
  }
}

type FactsRpc = (fn: "store_readiness_facts") => PromiseLike<{ data: unknown; error: unknown }>;

async function readFacts(db: SupabaseClient | null): Promise<StoreFacts | null> {
  if (!db) return null;
  try {
    const rpc = db.rpc.bind(db) as unknown as FactsRpc;
    const { data, error } = await rpc("store_readiness_facts");
    if (error || !data || typeof data !== "object") return null;
    const row = data as Record<string, unknown>;
    return {
      blocked_terms: Number(row.blocked_terms ?? 0),
      pattern_ready: row.pattern_ready === true,
      report_insert_grant: row.report_insert_grant === true,
      report_insert_policy: row.report_insert_policy === true,
      block_insert_grant: row.block_insert_grant === true,
      block_insert_policy: row.block_insert_policy === true,
    };
  } catch {
    return null;
  }
}

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

async function signInReviewer(): Promise<ReviewerEvidence | null> {
  const email = env("STORE_REVIEWER_EMAIL") || env("SEED_REVIEWER_EMAIL");
  const password = env("STORE_REVIEWER_PASSWORD") || env("SEED_REVIEWER_PASSWORD");
  if (!email || !password) return { configured: false };
  if (!isSupabaseConfigured()) return null;
  try {
    const client = createJsClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return { configured: true, signedIn: false, reason: error?.message ?? "" };
    }
    /* End exactly the session this check opened; the reviewer's own devices
       are untouched. */
    await client.auth.signOut({ scope: "local" }).catch(() => undefined);
    return { configured: true, signedIn: true };
  } catch {
    return null;
  }
}

/** Which of the listing ids on a page are examples, or null when unreadable. */
async function exampleIds(ids: readonly string[]): Promise<string[] | null> {
  if (ids.length === 0) return [];
  if (!isSupabaseConfigured()) return null;
  try {
    const client = createJsClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client
      .from("listings")
      .select("id, is_demo")
      .in("id", ids.slice(0, 50));
    if (error || !Array.isArray(data)) return null;
    return (data as { id: string; is_demo: boolean }[]).filter((row) => row.is_demo).map((row) => row.id);
  } catch {
    return null;
  }
}

export type StoreRun = { origin: string; checks: StoreCheck[] };

/**
 * Run every check. `db` is the operator's own client (the facts read is
 * staff-guarded inside the function); `origin` is where this request came in.
 */
export async function runStoreChecks(
  db: SupabaseClient | null,
  origin: string,
  copy: StoreCopy,
): Promise<StoreRun> {
  const base = origin.replace(/\/+$/, "");
  const shellAgent = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 ${SHELL_UA_MARK}`;

  const [facts, reviewer, deletion, aasa, assetlinks, privacy, landing, start, landingInShell] =
    await Promise.all([
      readFacts(db),
      signInReviewer(),
      fetchOwn(base, "/delete-account"),
      fetchOwn(base, "/.well-known/apple-app-site-association"),
      fetchOwn(base, "/.well-known/assetlinks.json"),
      fetchOwn(base, "/privacy"),
      fetchOwn(base, "/"),
      fetchOwn(base, SHELL_START, { follow: false, userAgent: shellAgent }),
      fetchOwn(base, "/", { follow: false, userAgent: shellAgent }),
    ]);

  const present: Record<string, boolean> = {};
  for (const processor of PROCESSORS) {
    for (const key of processor.env) present[key] = env(key).length > 0;
  }

  const landingIds = landing ? listingIdsIn(landing.text) : [];
  const examples = landing ? await exampleIds(landingIds) : null;

  const byKey: Record<string, StoreCheck> = {
    abuseFilter: abuseFilterCheck(facts, copy),
    reportBlock: reportBlockCheck(facts, copy),
    reviewer: reviewerCheck(reviewer, copy),
    deleteAccount: deleteAccountCheck(deletion ? deletion.status : null, copy),
    deepLinks: deepLinksCheck(
      aasa && aasa.status === 200 ? aasa.text : null,
      assetlinks && assetlinks.status === 200 ? assetlinks.text : null,
      copy,
    ),
    privacyProcessors: privacyProcessorsCheck(
      privacy && privacy.status === 200 ? privacy.text : null,
      processorsInUse(present),
      copy,
    ),
    exampleLabel: exampleLabelCheck(landing ? landing.text : null, examples, EXAMPLE_LABEL, copy),
    nativeStart: nativeStartCheck(start ? start.location : null, landingInShell ? landingInShell.location : null, copy),
    versions: versionsCheck(copy),
  };

  return { origin: base, checks: STORE_CHECK_ORDER.map((key) => byKey[key]!) };
}
