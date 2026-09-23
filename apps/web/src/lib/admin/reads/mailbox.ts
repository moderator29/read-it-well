import "server-only";

import { UNAVAILABLE, adminReader, readAll, type Read } from "./shared";

/**
 * HOW MANY ACCOUNTS SHARE ONE UNDERLYING MAILBOX.
 *
 * Gmail delivers `seyi+anything@gmail.com` and `s.e.y.i@gmail.com` to the same
 * inbox as `seyi@gmail.com`, so until today one person holding several Vallo
 * accounts looked to us like several people. `public.account_identities` holds
 * a canonical form of every address, written by a trigger at account creation
 * and backfilled once (migration `20260923163049`). This file is the only read
 * of it.
 *
 * WHAT THIS IS FOR AND WHAT IT IS NOT FOR. It is an investigative signal on a
 * staff screen. It refuses nobody, blocks nothing, and is never shown to the
 * account holder. Two accounts on one mailbox is not wrongdoing: a person may
 * hold a personal account and a business one, and our own QA pair is exactly
 * this mechanism used honestly. **It tells an operator where to look. It does
 * not tell them what they found.** Any screen drawing this must say so.
 *
 * THE CEILING, STATED HERE SO NOBODY READS THIS AS COVERAGE. A catch-all
 * custom domain gives one person unlimited addresses that no canonical form
 * can ever link. This sees the cheap, common case and nothing more. The real
 * defences are on consequential actions and are assessed in
 * `docs/ONE_PERSON_MANY_ACCOUNTS.md`.
 *
 * Read through the operator's own session like every other file in this
 * directory, so the admin-only SELECT policy on the table is the authority.
 */

/** How the canonical form was reached, so an operator can weigh the link. */
export type CanonicalRule = "gmail" | "plus_strip" | "lowercase_only" | "unparseable";

export type MailboxLink = {
  /** The canonical address. Personal data: never put it in a log or a URL. */
  canonical: string;
  rule: CanonicalRule;
  /** Accounts on this mailbox, INCLUDING the one asked about. 1 means no link. */
  accountsSharing: number;
  /** The other accounts on the same mailbox, never including the one asked about. */
  siblingUserIds: string[];
};

export type SharedMailbox = {
  canonical: string;
  rule: CanonicalRule;
  userIds: string[];
};

export type IdentityRow = { user_id: string; email_canonical: string; canonical_rule: string };

function asRule(raw: string): CanonicalRule {
  return raw === "gmail" || raw === "plus_strip" || raw === "unparseable" ? raw : "lowercase_only";
}

/**
 * Every identity row. The table is one row per account, so this is the size of
 * the platform's membership and `readAll` refuses rather than returning a
 * prefix: a partial read here would draw "1 account" beside somebody who has
 * five, which is worse than drawing nothing.
 */
async function everyRow(): Promise<IdentityRow[] | null> {
  const db = await adminReader();
  if (!db) return null;
  return readAll<IdentityRow>((from, to) =>
    db
      .from("account_identities")
      .select("user_id, email_canonical, canonical_rule")
      .order("user_id", { ascending: true })
      .range(from, to),
  );
}

function group(rows: readonly IdentityRow[]): Map<string, IdentityRow[]> {
  const byCanonical = new Map<string, IdentityRow[]>();
  for (const row of rows) {
    const bucket = byCanonical.get(row.email_canonical);
    if (bucket) bucket.push(row);
    else byCanonical.set(row.email_canonical, [row]);
  }
  return byCanonical;
}

/**
 * THE PURE HALF, so the counting can be tested without a database. A link is
 * only ever computed from the WHOLE table, never from the rows asked about:
 * counting siblings inside a filtered set is how "1 account" gets drawn beside
 * somebody who has five.
 */
export function mailboxLinks(
  rows: readonly IdentityRow[],
  userIds: readonly string[],
): Map<string, MailboxLink> {
  const wanted = new Set(userIds.filter(Boolean));
  const byCanonical = group(rows);
  const out = new Map<string, MailboxLink>();
  for (const row of rows) {
    if (!wanted.has(row.user_id)) continue;
    const bucket = byCanonical.get(row.email_canonical) ?? [row];
    out.set(row.user_id, {
      canonical: row.email_canonical,
      rule: asRule(row.canonical_rule),
      accountsSharing: bucket.length,
      siblingUserIds: bucket.filter((other) => other.user_id !== row.user_id).map((other) => other.user_id),
    });
  }
  return out;
}

/** The mailbox link for each named account. Accounts with no row are absent. */
export async function readMailboxLinks(
  userIds: readonly string[],
): Promise<Read<Map<string, MailboxLink>>> {
  if (userIds.filter(Boolean).length === 0) return { state: "ok", data: new Map() };
  const rows = await everyRow();
  if (rows === null) return UNAVAILABLE;
  return { state: "ok", data: mailboxLinks(rows, userIds) };
}

/**
 * Every mailbox behind more than one account, most accounts first. This is the
 * whole list, not a page: a mailbox left off the end is the one an operator
 * needed to see.
 */
export async function readSharedMailboxes(): Promise<Read<SharedMailbox[]>> {
  const rows = await everyRow();
  if (rows === null) return UNAVAILABLE;
  return { state: "ok", data: sharedMailboxes(rows) };
}

/** The pure half of the above. */
export function sharedMailboxes(rows: readonly IdentityRow[]): SharedMailbox[] {
  const shared: SharedMailbox[] = [];
  for (const [canonical, bucket] of group(rows)) {
    if (bucket.length < 2) continue;
    shared.push({
      canonical,
      rule: asRule(bucket[0]!.canonical_rule),
      userIds: bucket.map((row) => row.user_id),
    });
  }
  shared.sort((a, b) => b.userIds.length - a.userIds.length || a.canonical.localeCompare(b.canonical));
  return shared;
}
