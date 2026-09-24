import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { isArrivalAnswer, readArrivalCheckState, type ArrivalAnswer, type ArrivalCheckState } from "./arrival-check";

/**
 * V-91 reads. They fail soft: a read that failed draws nothing on the
 * guest's booking, and the console says it could not read.
 *
 * The table and functions are newer than the generated types, so the reads
 * go through the untyped client; row level security and the definer
 * functions' own checks decide what comes back.
 */

async function loose(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  return (await createClient()) as unknown as SupabaseClient;
}

/** The guest's own booking: is the check open, and what did they answer. */
export async function readMyArrivalCheck(bookingId: string): Promise<ArrivalCheckState> {
  try {
    const db = await loose();
    if (!db) return { state: "none" };
    const { data, error } = await db.rpc("arrival_check_state", { p_booking: bookingId });
    if (error) return { state: "failed" };
    return readArrivalCheckState(data);
  } catch {
    return { state: "failed" };
  }
}

export type ArrivalCheckRecord = {
  answer: ArrivalAnswer;
  note: string | null;
  answeredAt: string;
  reference: string | null;
  photoUrls: string[];
};

/** For staff: the answer and short-lived links to its photos. Null when none. */
export async function readArrivalCheckRecord(
  bookingId: string,
): Promise<ArrivalCheckRecord | null | "unavailable"> {
  try {
    const db = await loose();
    if (!db) return "unavailable";
    const { data, error } = await db
      .from("booking_arrival_checks")
      .select("answer, note, answered_at, ticket_ref, photo_paths")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (error) return "unavailable";
    if (!data) return null;
    const row = data as { answer?: unknown; note?: unknown; answered_at?: unknown; ticket_ref?: unknown; photo_paths?: unknown };
    if (!isArrivalAnswer(row.answer) || typeof row.answered_at !== "string") return "unavailable";
    const paths = Array.isArray(row.photo_paths) ? row.photo_paths.filter((p): p is string => typeof p === "string") : [];
    let photoUrls: string[] = [];
    if (paths.length > 0) {
      const signed = await db.storage.from("arrival-evidence").createSignedUrls(paths, 3600);
      photoUrls = (signed.data ?? []).flatMap((item) => (item.signedUrl ? [item.signedUrl] : []));
    }
    return {
      answer: row.answer,
      note: typeof row.note === "string" ? row.note : null,
      answeredAt: row.answered_at,
      reference: typeof row.ticket_ref === "string" ? row.ticket_ref : null,
      photoUrls,
    };
  } catch {
    return "unavailable";
  }
}
