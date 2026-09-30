/**
 * ONE PULL OF ANOTHER SITE'S CALENDAR (C2, 30 September 2026), with its
 * network and its database handed in so every branch can be tested.
 *
 * The scheduled job (`lib/cron/jobs/calendar-sync.ts`) asks the database
 * which links are due (`calendar_imports_due`), pulls each one here, and
 * hands the nights, or the reason it failed, to `apply_calendar_import`,
 * which closes and reopens the nights in one transaction. Nothing here
 * writes a night itself.
 *
 * THE SWITCH. `CALENDAR_SYNC_ENABLED` (off unless "1" or "true"): the job
 * does nothing until the founder turns it on. `CALENDAR_SYNC_INTERVAL_MINUTES`
 * (30 unless set, never under 15 or over a day) is how stale a link may get
 * before it is pulled again; the scheduler runs the job every 15 minutes and
 * the database picks only the links older than this.
 */

import { MAX_FEED_BYTES, checkFeedUrl, isPrivateAddress, readFeed } from "./ical";
import { addDays, lagosToday } from "./rate-calendar";

export const DEFAULT_SYNC_INTERVAL_MINUTES = 30;
/** How many links one run pulls at most, and how many at once. */
export const SYNC_BATCH = 40;
export const SYNC_CONCURRENCY = 4;
/** One link's budget, and the whole run's. */
export const FETCH_TIMEOUT_MS = 10_000;
export const RUN_BUDGET_MS = 45_000;
/** How far ahead a pulled calendar may close nights. */
export const SYNC_HORIZON_DAYS = 540;

type Env = Record<string, string | undefined>;

export function calendarSyncEnabled(env: Env = process.env): boolean {
  const value = (env.CALENDAR_SYNC_ENABLED ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

export function syncIntervalMinutes(env: Env = process.env): number {
  const raw = Number.parseInt((env.CALENDAR_SYNC_INTERVAL_MINUTES ?? "").trim(), 10);
  if (!Number.isFinite(raw)) return DEFAULT_SYNC_INTERVAL_MINUTES;
  return Math.min(Math.max(raw, 15), 1440);
}

export type DueImport = { id: string; url: string; source: string };

export type Fetcher = (url: string, init: { signal: AbortSignal; redirect: "manual"; headers: Record<string, string> }) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

/** Every address a host name resolves to (dns.lookup with all: true). */
export type Resolver = (host: string) => Promise<string[]>;

export type Applier = (importId: string, nights: string[] | null, error: string | null) => Promise<void>;

export type PullOutcome = { id: string; ok: true; nights: number } | { id: string; ok: false; reason: string };

/**
 * Fetch one link, following at most three redirects, each of which must stay
 * on the list of sites. A body over the size cap, a non-200, a page that is
 * not a calendar, or a timeout is a failure with a short reason; the reason
 * is what the host reads under the link, so it is written for them.
 */
export async function pullFeed(
  fetcher: Fetcher,
  url: string,
  resolve: Resolver,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  let current = url;
  for (let hop = 0; hop < 4; hop += 1) {
    const checked = checkFeedUrl(current);
    if (!checked.ok) return { ok: false, reason: "The link now points somewhere we cannot read." };
    /* SSRF: every address the name resolves to must be public, checked on
       every hop, so neither a name nor a redirect can reach inside. */
    let addresses: string[];
    try {
      addresses = await resolve(new URL(checked.url).hostname);
    } catch {
      return { ok: false, reason: "The site's address could not be found. We will try again." };
    }
    if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
      return { ok: false, reason: "The link now points somewhere we cannot read." };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetcher(checked.url, {
        signal: controller.signal,
        redirect: "manual",
        headers: { accept: "text/calendar, text/plain;q=0.8", "user-agent": "Vallo-Calendar-Sync/1.0" },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) return { ok: false, reason: `The site answered ${res.status} with nowhere to go.` };
        current = new URL(next, checked.url).toString();
        continue;
      }
      if (res.status === 404 || res.status === 410) return { ok: false, reason: "The site says this calendar link no longer exists." };
      if (res.status === 401 || res.status === 403) return { ok: false, reason: "The site would not share this calendar. Copy a fresh export link." };
      if (res.status !== 200) return { ok: false, reason: `The site answered ${res.status}. We will try again.` };
      const length = Number(res.headers.get("content-length") ?? "0");
      if (length > MAX_FEED_BYTES) return { ok: false, reason: "That calendar is too large to read." };
      const text = await readCapped(res, MAX_FEED_BYTES);
      if (text === null) return { ok: false, reason: "That calendar is too large to read." };
      return { ok: true, text };
    } catch {
      return { ok: false, reason: "The site did not answer in time. We will try again." };
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, reason: "The link redirected too many times." };
}

/**
 * The body, stopped at the cap while it streams when the response can stream,
 * so a huge answer is never held in memory whole. Null when over the cap.
 */
async function readCapped(res: Awaited<ReturnType<Fetcher>>, cap: number): Promise<string | null> {
  const body = (res as { body?: ReadableStream<Uint8Array> | null }).body;
  if (!body || typeof body.getReader !== "function") {
    const text = await res.text();
    return text.length > cap ? null : text;
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > cap) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** Pull one due link and hand the result to the database. Never throws. */
export async function syncOne(
  fetcher: Fetcher,
  apply: Applier,
  row: DueImport,
  resolve: Resolver,
  now: Date = new Date(),
): Promise<PullOutcome> {
  const from = lagosToday(now);
  const to = addDays(from, SYNC_HORIZON_DAYS);
  const pulled = await pullFeed(fetcher, row.url, resolve);
  if (!pulled.ok) {
    await apply(row.id, null, pulled.reason);
    return { id: row.id, ok: false, reason: pulled.reason };
  }
  const read = readFeed(pulled.text, { from, to });
  if (!read.ok) {
    await apply(row.id, null, read.reason);
    return { id: row.id, ok: false, reason: read.reason };
  }
  await apply(row.id, read.nights, null);
  return { id: row.id, ok: true, nights: read.nights.length };
}

/** Run a list of pulls a few at a time, stopping new ones once the budget is spent. */
export async function syncAll(
  rows: readonly DueImport[],
  one: (row: DueImport) => Promise<PullOutcome>,
  options: { concurrency?: number; budgetMs?: number; now?: () => number } = {},
): Promise<{ outcomes: PullOutcome[]; skipped: number }> {
  const concurrency = options.concurrency ?? SYNC_CONCURRENCY;
  const budget = options.budgetMs ?? RUN_BUDGET_MS;
  const clock = options.now ?? Date.now;
  const started = clock();
  const outcomes: PullOutcome[] = [];
  let next = 0;
  let skipped = 0;
  async function worker(): Promise<void> {
    while (next < rows.length) {
      const row = rows[next];
      next += 1;
      if (!row) continue;
      if (clock() - started > budget) {
        skipped += 1;
        continue;
      }
      outcomes.push(await one(row));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, rows.length) }, worker));
  return { outcomes, skipped };
}
