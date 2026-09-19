import "server-only";

import { bestEffortEmail, sendMessage } from "../email/client";
import { writeDeletionAudit, type DeletionAction, type DeletionAuditDetail } from "./audit";
import { deletionCompleted } from "./emails";
import { callDeletionRpcOrThrow, type DeletionClient } from "./rpc";
import { supabaseStorageDoor } from "./storage";
import type { PurgeDeps } from "./purge";

/**
 * The real dependencies the scheduled purge runs on, bound in one place.
 *
 * `purge.ts` holds the decision and knows nothing about Supabase, Resend or
 * the environment. This file is the wiring, and it is the only file in the
 * deletion flow that both reaches the network and cannot be unit tested, which
 * is deliberate: everything worth proving lives on the other side of these
 * five functions.
 */

type AdminAuthClient = DeletionClient & {
  auth: {
    admin: {
      getUserById(id: string): PromiseLike<{
        data: { user: { email?: string | null; user_metadata?: Record<string, unknown> | null } | null };
        error: unknown;
      }>;
      updateUserById(
        id: string,
        attributes: Record<string, unknown>,
      ): PromiseLike<{ data: unknown; error: unknown }>;
    };
  };
};

/**
 * The name to greet them by in the last email, and the address to send it to.
 *
 * Read BEFORE anything is destroyed, held for the length of one purge, and
 * never stored, logged or written to the audit line.
 */
async function readContact(
  admin: AdminAuthClient,
  userId: string,
): Promise<{ email: string | null; name: string | null }> {
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) return { email: null, name: null };
    const email = typeof data.user.email === "string" ? data.user.email : null;
    let name: string | null = null;
    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("first_name")
        .eq("id", userId)
        .maybeSingle();
      name = profile?.first_name ?? null;
    } catch {
      name = null;
    }
    return { email, name };
  } catch {
    return { email: null, name: null };
  }
}

/**
 * The admin-API half of the auth scrub.
 *
 * The SQL half inside `purge_account_rows` does the same work plus the
 * identity rows, and reports whether it was allowed to. This half exists
 * because a database that does not grant `postgres` write access to the auth
 * schema would otherwise leave an address sitting on `auth.users` after a
 * deletion the person was told had completed.
 *
 * The pseudonymous address is on a `.invalid` domain, which RFC 2606 reserves
 * and which therefore cannot resolve anywhere. It is unique per uuid, so it
 * never collides, and it frees the person's real address for a new account.
 */
async function scrubAuth(admin: AdminAuthClient, userId: string): Promise<boolean> {
  try {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email: `deleted+${userId.replace(/-/g, "")}@deleted.invalid`,
      phone: "",
      email_confirm: false,
      phone_confirm: false,
      user_metadata: {},
      app_metadata: {},
      // Ten years, in hours. `banned_until` is also set to infinity by the SQL
      // half; this is the longest span the API's duration grammar accepts and
      // it is far longer than the row will ever be looked at.
      ban_duration: "87600h",
    });
    return !error;
  } catch {
    return false;
  }
}

/** Every dependency `runAccountPurges` needs, bound to the real world. */
export function purgeDeps(admin: DeletionClient): PurgeDeps {
  const authed = admin as AdminAuthClient;
  return {
    rpc: (fn, args) => callDeletionRpcOrThrow(admin, fn, args),
    storage: supabaseStorageDoor(
      admin as unknown as Parameters<typeof supabaseStorageDoor>[0],
    ),
    readContact: (userId) => readContact(authed, userId),
    scrubAuth: (userId) => scrubAuth(authed, userId),
    sendCompleted: async (to, name) => {
      await bestEffortEmail(() => sendMessage(to, deletionCompleted({ name })));
    },
    audit: (
      action: DeletionAction,
      userId: string | null,
      requestId: string | null,
      detail?: DeletionAuditDetail,
    ) => writeDeletionAudit(admin, { action, userId, requestId, detail }),
  };
}
