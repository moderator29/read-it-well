import "server-only";

import { getAgentContext } from "../agent/listings-queries";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import type { BoardSubject } from "./board";

/**
 * V-08: THE BOARD'S TWO SERVER READS, BOTH FAIL CLOSED.
 *
 * `listingBoardIsOn` follows `lib/flags/read.ts`: anything other than a
 * `feature_flags.listing_board` row that says true is off. A missing row, an
 * error, no configuration: off. The same flag gates the VL- code at the share
 * door, inside `public.share_door`, so the board and the code that reads it
 * switch on together.
 *
 * `ownedBoardSubject` proves ownership the way the calendar does: it reads the
 * listing under the agent's own client and matches it to their agent row,
 * never trusting the URL. A published listing is readable by anybody, so
 * reading it is not proof of anything; the agent id match is.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listingBoardIsOn(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "listing_board")
      .maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}

export type OwnedBoard =
  | { state: "ready"; subject: BoardSubject }
  | { state: "signed-out" | "not-agent" | "missing" | "unavailable" };

export async function ownedBoardSubject(listingId: string): Promise<OwnedBoard> {
  if (!UUID_RE.test(listingId)) return { state: "missing" };
  const context = await getAgentContext();
  if (context.state === "unconfigured") return { state: "unavailable" };
  if (context.state === "signed-out") return { state: "signed-out" };
  if (context.state === "not-agent") return { state: "not-agent" };
  try {
    const { data, error } = await context.supabase
      .from("listings")
      .select("id, agent_id, reference, status, listing_intent, property_type, bedrooms, is_demo")
      .eq("id", listingId)
      .maybeSingle();
    if (error) return { state: "unavailable" };
    if (!data || data.agent_id !== context.agent.id) return { state: "missing" };
    return {
      state: "ready",
      subject: {
        /* Only a published listing's code is printed: a code on a board for a
           listing a stranger cannot open is a dead end painted on a wall. */
        reference: data.status === "PUBLISHED" ? data.reference : null,
        intent: data.listing_intent === "sale" ? "sale" : "rent",
        propertyType: data.property_type,
        bedrooms: data.bedrooms,
        isDemo: data.is_demo === true,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}
