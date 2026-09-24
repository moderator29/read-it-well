import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSession } from "../actions/session";
import { flagIsOn, NEIGHBOURS_FLAG } from "../flags/read";
import type { Database } from "../supabase/database.types";
import { isFlooding, summarise, type AreaSummary, type Flooding, type PulseEligibility, type SummaryRow } from "./pulse";

/**
 * The reads behind the neighbours' account (V-41). Every one of them answers
 * "unavailable" rather than throwing when migration `20260924150700` is not
 * applied, so the listing page and the Around page never depend on it.
 */

type Rpc = { rpc: (fn: string, args?: object) => Promise<{ data: unknown; error: unknown }> };

export type Neighbours =
  | { state: "unavailable" }
  /** No active Around area matches the listing's state and area. */
  | { state: "no-area" }
  /** An area, and whatever passed the five-member threshold (possibly nothing). */
  | { state: "ok"; areaName: string; summary: AreaSummary };

export async function readNeighbours(
  supabase: SupabaseClient<Database>,
  stateCode: string | undefined,
  area: string | undefined,
): Promise<Neighbours> {
  if (!stateCode || !area) return { state: "no-area" };
  try {
    const { data, error } = await (supabase as unknown as Rpc).rpc("area_pulse_summary", {
      p_state: stateCode,
      p_area: area,
    });
    if (error) return { state: "unavailable" };
    const rows = (Array.isArray(data) ? data : []) as SummaryRow[];
    if (rows.length > 0) {
      const summary = summarise(rows);
      return { state: "ok", areaName: summary.areaName ?? area, summary };
    }
    /* Nothing passed the threshold: say whether an area exists at all. */
    const { data: found } = await supabase
      .from("areas")
      .select("name")
      .eq("state_code", stateCode)
      .ilike("area", area.trim())
      .eq("status", "ACTIVE")
      .limit(1)
      .maybeSingle();
    if (!found) return { state: "no-area" };
    return { state: "ok", areaName: (found as { name: string }).name, summary: { areaName: null, kinds: [] } };
  } catch {
    return { state: "unavailable" };
  }
}

/** The lister's own flooding answer. Null: unanswered. Undefined: not readable (no migration). */
export async function readFlooding(
  supabase: SupabaseClient<Database>,
  listingId: string,
): Promise<Flooding | null | undefined> {
  try {
    const { data, error } = await supabase.from("listings").select("flooding" as never).eq("id", listingId).maybeSingle();
    if (error || !data) return undefined;
    const value = (data as { flooding?: unknown }).flooding;
    return isFlooding(value) ? value : null;
  } catch {
    return undefined;
  }
}

/** What the caller may be asked for one area, or null when not a member or unavailable. */
export async function readMyPulse(
  supabase: SupabaseClient<Database>,
  areaId: string,
): Promise<PulseEligibility | null> {
  try {
    const { data, error } = await (supabase as unknown as Rpc).rpc("my_pulse_areas");
    if (error || !Array.isArray(data)) return null;
    const row = (data as (PulseEligibility & { area_id: string })[]).find((r) => r.area_id === areaId);
    if (!row) return null;
    return { eligible: row.eligible, lister: row.lister, light: row.light, water: row.water, flood: row.flood };
  } catch {
    return null;
  }
}

/** The same, with the caller's own session: null when signed out. */
export async function readMyPulseSession(areaId: string): Promise<PulseEligibility | null> {
  if (!(await flagIsOn(NEIGHBOURS_FLAG))) return null;
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  return readMyPulse(session.supabase, areaId);
}
