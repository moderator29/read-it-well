import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The columns of a listing or a business that belong to its owner and to
 * staff, never to every signed-in member.
 *
 * `authenticated` holds no SELECT on these columns, because a free account is not a reason to read an occupied rental's street
 * address, a moderator's note, or a firm's CAC, TIN and representative's phone.
 * The owner's and staff's screens read them through two SECURITY DEFINER
 * functions that return rows only for listings the caller lists (or whose firm
 * they belong to) and businesses the caller owns, or anything for staff.
 *
 * The main read names only the public columns; the private ones are fetched
 * by id and merged in. A row the caller is not entitled to merges as nulls.
 * A failed call throws: an owner's form filled with blanks would save them
 * back over the real values.
 */

export class PrivateFieldsUnavailable extends Error {
  constructor(fn: string) {
    super(`${fn} did not answer`);
    this.name = "PrivateFieldsUnavailable";
  }
}

export const LISTING_PRIVATE_COLUMNS = ["address", "landmark", "review_notes", "reviewer_id"] as const;
export const BUSINESS_PRIVATE_COLUMNS = [
  "address",
  "phone",
  "email",
  "cac_number",
  "registered_name",
  "tin",
  "representative_name",
  "representative_phone",
  "consents",
  "review_notes",
  "reviewer_id",
  "verification_tier",
] as const;

export type ListingPrivate = {
  id: string;
  address: string | null;
  landmark: string | null;
  review_notes: string | null;
  reviewer_id: string | null;
};

export type BusinessPrivate = {
  id: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  cac_number: string | null;
  registered_name: string | null;
  tin: string | null;
  representative_name: string | null;
  representative_phone: string | null;
  consents: unknown;
  review_notes: string | null;
  reviewer_id: string | null;
  verification_tier: number | null;
};

type RpcClient = Pick<SupabaseClient, "rpc">;

async function fetchById<T extends { id: string }>(
  client: RpcClient,
  fn: string,
  ids: string[],
): Promise<Map<string, T>> {
  const out = new Map<string, T>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return out;
  const { data, error } = await (client as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  }).rpc(fn, { p_ids: unique });
  if (error || !Array.isArray(data)) throw new PrivateFieldsUnavailable(fn);
  for (const row of data as T[]) out.set(row.id, row);
  return out;
}

export function listingPrivateFields(client: RpcClient, ids: string[]): Promise<Map<string, ListingPrivate>> {
  return fetchById<ListingPrivate>(client, "listing_private_fields", ids);
}

export function businessPrivateFields(client: RpcClient, ids: string[]): Promise<Map<string, BusinessPrivate>> {
  return fetchById<BusinessPrivate>(client, "business_private_fields", ids);
}

/**
 * Remove top-level columns from a comma-separated PostgREST select. Columns
 * inside an embed (`child(a, b)`) belong to the child table and are kept.
 */
export function withoutColumns(select: string, columns: readonly string[]): string {
  const drop = new Set(columns);
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of select) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.filter((part) => !drop.has(part.trim())).join(",");
}

/** Merge the private fields of each row into it (nulls when not entitled). */
export async function withListingPrivate<R extends { id: string }>(
  client: RpcClient,
  rows: R[],
): Promise<(R & Omit<ListingPrivate, "id">)[]> {
  const extra = await listingPrivateFields(client, rows.map((r) => r.id));
  return rows.map((row) => {
    const p = extra.get(row.id);
    return {
      ...row,
      address: p?.address ?? null,
      landmark: p?.landmark ?? null,
      review_notes: p?.review_notes ?? null,
      reviewer_id: p?.reviewer_id ?? null,
    };
  });
}

export async function withBusinessPrivate<R extends { id: string }, K extends (typeof BUSINESS_PRIVATE_COLUMNS)[number]>(
  client: RpcClient,
  rows: R[],
  keys: readonly K[],
): Promise<(R & Pick<Omit<BusinessPrivate, "id">, K>)[]> {
  const extra = await businessPrivateFields(client, rows.map((r) => r.id));
  return rows.map((row) => {
    const p = extra.get(row.id);
    const merged: Record<string, unknown> = { ...row };
    for (const key of keys) merged[key] = p ? (p as Record<string, unknown>)[key] ?? null : null;
    return merged as R & Pick<Omit<BusinessPrivate, "id">, K>;
  });
}
