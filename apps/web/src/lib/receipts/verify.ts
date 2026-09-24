import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { isSupabaseConfigured } from "../supabase/env";
import { ipFromHeaders } from "../security/rate-limit";
import { normaliseReceiptCode, readVerifyAnswer, type VerifyOutcome } from "./code";

/**
 * V-55. Check a receipt code, for anybody.
 *
 * Runs on the server with the service role, the only role `verify_receipt`
 * is granted to, so nobody can call it directly and dodge the per-caller
 * limit. The caller's address is passed only as a hash, the rate limit's
 * subject, so the counter table never holds a raw address. A string that cannot be a code is answered
 * without spending a lookup.
 */
export async function verifyReceiptCode(raw: string): Promise<VerifyOutcome> {
  const code = normaliseReceiptCode(raw);
  if (!code) return { state: "not_found" };
  if (!isSupabaseConfigured()) return { state: "unavailable" };
  try {
    const ip = ipFromHeaders(await headers());
    const subject = `ip:${createHash("sha256").update(ip, "utf8").digest("hex").slice(0, 32)}`;
    const client = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await client.rpc("verify_receipt", { p_code: code, p_subject: subject });
    if (error) return { state: "unavailable" };
    return readVerifyAnswer(data);
  } catch {
    return { state: "unavailable" };
  }
}
