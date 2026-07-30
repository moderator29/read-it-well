import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import type { Database, Json } from "../supabase/database.types";
import { isSupabaseConfigured, SUPABASE_URL, serviceRoleKey } from "../supabase/env";

/**
 * Wallet ledger writes. Service-role only, shared by the wallet server
 * actions and the Paystack webhook so both paths post money identically.
 *
 * The ledger is append-only and balances are derived, never stored. Every
 * write here is idempotent on the unique `reference` column: posting the same
 * reference twice is a no-op, which is what makes a replayed webhook and the
 * verify-on-redirect fallback safe to run against each other.
 */

export type AdminClient = SupabaseClient<Database>;

type EntryKind = Database["public"]["Enums"]["wallet_entry_kind"];
type EntryDirection = Database["public"]["Enums"]["wallet_entry_direction"];
type EntryStatus = Database["public"]["Enums"]["wallet_entry_status"];

/** True when both the public Supabase config and the service key are present. */
export function isWalletServiceConfigured(): boolean {
  return isSupabaseConfigured() && (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").length > 0;
}

/** The admin client, or null when the service environment is incomplete. */
export function getAdminClient(): AdminClient | null {
  if (!isWalletServiceConfigured()) return null;
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * Lazy wallet creation, exactly as the migration documents it: insert keyed
 * on the unique user_id with on-conflict-do-nothing, then read the row back.
 * Safe under concurrent first uses. Returns the wallet id.
 */
export async function ensureWalletId(admin: AdminClient, userId: string): Promise<string> {
  const inserted = await admin
    .from("wallets")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (inserted.error) throw new Error(inserted.error.message);
  if (inserted.data) return inserted.data.id;

  const existing = await admin
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .single();
  if (existing.error) throw new Error(existing.error.message);
  return existing.data.id;
}

/**
 * Post one ledger row, idempotent on reference. Returns "posted" when the row
 * was written and "duplicate" when the reference already exists, in which
 * case the ledger is left untouched.
 */
export async function postEntry(
  admin: AdminClient,
  entry: {
    walletId: string;
    kind: EntryKind;
    direction: EntryDirection;
    amountMinor: number;
    reference: string;
    status: EntryStatus;
    metadata?: Record<string, Json>;
  },
): Promise<"posted" | "duplicate"> {
  const { data, error } = await admin
    .from("wallet_entries")
    .upsert(
      {
        wallet_id: entry.walletId,
        kind: entry.kind,
        direction: entry.direction,
        amount_minor: entry.amountMinor,
        reference: entry.reference,
        status: entry.status,
        metadata: entry.metadata ?? {},
      },
      { onConflict: "reference", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? "posted" : "duplicate";
}

/**
 * The spendable balance in kobo: the derived COMPLETED balance minus every
 * PENDING debit, so money already committed to an in-flight withdrawal can
 * never be spent twice while the transfer settles.
 */
export async function availableBalanceMinor(
  admin: AdminClient,
  walletId: string,
): Promise<number> {
  const balanceRead = await admin
    .from("wallet_balances")
    .select("balance_minor")
    .eq("wallet_id", walletId)
    .maybeSingle();
  if (balanceRead.error) throw new Error(balanceRead.error.message);
  const settled = balanceRead.data?.balance_minor ?? 0;

  const pendingRead = await admin
    .from("wallet_entries")
    .select("amount_minor")
    .eq("wallet_id", walletId)
    .eq("status", "PENDING")
    .eq("direction", "debit");
  if (pendingRead.error) throw new Error(pendingRead.error.message);

  let held = 0;
  for (const row of pendingRead.data ?? []) held += row.amount_minor;
  return settled - held;
}

/** Flip one entry, matched by unique reference, to a new status. */
export async function setEntryStatus(
  admin: AdminClient,
  reference: string,
  status: EntryStatus,
  extraMetadata?: Record<string, Json>,
): Promise<void> {
  if (extraMetadata) {
    const current = await admin
      .from("wallet_entries")
      .select("metadata")
      .eq("reference", reference)
      .maybeSingle();
    const merged = {
      ...(current.data && typeof current.data.metadata === "object" && current.data.metadata !== null && !Array.isArray(current.data.metadata)
        ? (current.data.metadata as Record<string, Json>)
        : {}),
      ...extraMetadata,
    };
    const { error } = await admin
      .from("wallet_entries")
      .update({ status, metadata: merged })
      .eq("reference", reference);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await admin.from("wallet_entries").update({ status }).eq("reference", reference);
  if (error) throw new Error(error.message);
}

/**
 * Settle a PENDING withdrawal after Paystack reports the transfer's fate.
 * Only PENDING rows move, so a replayed webhook cannot flip a settled entry.
 */
export async function settleWithdrawal(
  admin: AdminClient,
  reference: string,
  status: Extract<EntryStatus, "COMPLETED" | "FAILED" | "REVERSED">,
): Promise<void> {
  const { error } = await admin
    .from("wallet_entries")
    .update({ status })
    .eq("reference", reference)
    .eq("kind", "withdrawal")
    .eq("status", "PENDING");
  if (error) throw new Error(error.message);
}

/**
 * Credit a wallet funding idempotently: lazily create the owner's wallet,
 * then post the COMPLETED deposit keyed on the rm-fund reference. Used by
 * both the webhook and the verify-on-redirect fallback; whichever runs
 * second is a clean duplicate. The completion notification fires from the
 * database trigger, never from here.
 */
export async function recordFunding(
  admin: AdminClient,
  params: {
    userId: string;
    amountMinor: number;
    reference: string;
    metadata?: Record<string, Json>;
  },
): Promise<"posted" | "duplicate"> {
  const walletId = await ensureWalletId(admin, params.userId);
  return postEntry(admin, {
    walletId,
    kind: "deposit",
    direction: "credit",
    amountMinor: params.amountMinor,
    reference: params.reference,
    status: "COMPLETED",
    metadata: { note: "Wallet funding", ...(params.metadata ?? {}) },
  });
}

type AdminUser = { id: string; email?: string | null };

/**
 * Resolve a user id by email through the GoTrue admin API. profiles carries
 * no email column by design, so this is the one lookup that touches auth
 * users, and it runs with the service key on the server only. The filter
 * parameter narrows server-side; the exact match is confirmed here.
 */
export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  if (!isWalletServiceConfigured()) return null;
  const wanted = email.trim().toLowerCase();
  try {
    const key = serviceRoleKey();
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(wanted)}&per_page=50`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { users?: AdminUser[] } | AdminUser[];
    const users = Array.isArray(body) ? body : (body.users ?? []);
    return users.find((u) => (u.email ?? "").toLowerCase() === wanted) ?? null;
  } catch {
    return null;
  }
}

/** A user's display name from profiles, or null. For ledger row notes. */
export async function displayNameFor(admin: AdminClient, userId: string): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  const name = data?.display_name?.trim() ?? "";
  return name.length > 0 ? name : null;
}
