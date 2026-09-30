import "server-only";

import { countReasons } from "../review-reason-counts";
import { UNAVAILABLE, adminReader, type Read } from "./shared";

/** C8 (d): the last 30 days' send-back reasons, from the audit rows the review writes. */
export async function getSendBackReasons(now: number): Promise<Read<{ code: string; label: string; count: number }[]>> {
  const db = await adminReader();
  if (!db) return UNAVAILABLE;
  try {
    const from = new Date(now - 30 * 86_400_000).toISOString();
    const { data, error } = await db
      .from("audit_log")
      .select("metadata")
      .eq("action", "listing.review")
      .gte("created_at", from)
      .limit(5000);
    if (error) return UNAVAILABLE;
    return { state: "ok", data: countReasons((data ?? []) as { metadata: unknown }[]) };
  } catch {
    return UNAVAILABLE;
  }
}
