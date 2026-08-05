import "server-only";

import { cache } from "react";
import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import type {
  LocalGovernmentOption,
  OccupationOption,
  StateOption,
} from "./reference";

/**
 * Reads of the three reference tables Nigeria's address and work fields need.
 *
 * All three carry `for select using (true)`, so an anonymous visitor filling in
 * a sign-up form can read them with no session at all. That is the point: the
 * pickers have to work before an account exists.
 *
 * Every read is wrapped in React's per-request cache, because a single sign-up
 * render asks for the state list from the page and again from the picker, and
 * one round trip is the right number.
 *
 * Failure is always an empty list, never an exception. A reference table that
 * cannot be reached must degrade into a field that says it cannot offer choices
 * right now, not into a page that will not render.
 */

export const listStates = cache(async function listStates(): Promise<StateOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("states")
      .select("code, name")
      .order("name", { ascending: true });
    if (error || !data) return [];
    return data.map((row) => ({ code: row.code, name: row.name }));
  } catch {
    return [];
  }
});

export const listLocalGovernments = cache(async function listLocalGovernments(
  stateCode: string,
): Promise<LocalGovernmentOption[]> {
  if (!isSupabaseConfigured()) return [];
  const code = stateCode.trim().toUpperCase();
  if (code.length === 0) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("local_governments")
      .select("code, state_code, name")
      .eq("state_code", code)
      .order("name", { ascending: true });
    if (error || !data) return [];
    return data.map((row) => ({
      code: row.code,
      stateCode: row.state_code,
      name: row.name,
    }));
  } catch {
    return [];
  }
});

/**
 * All 749 occupations, ordered so the picker's groups arrive already sorted:
 * category first, then the curated `sort_order` inside it, then the name as a
 * tie-break so two rows sharing a sort order never swap places between loads.
 */
export const listOccupations = cache(async function listOccupations(): Promise<OccupationOption[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("occupations")
      .select("code, name, category, sort_order")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true })
      .limit(2000);
    if (error || !data) {
      /*
       * Say why. This used to return [] silently, and the picker renders an
       * empty list as "We could not load the list just now" - so a real
       * failure and a genuinely empty table produced the same sentence with
       * nothing anywhere to tell them apart. The occupations table has 749
       * rows and occupations_select is `using (true)`, so if this list is
       * empty in production the cause is environment or connectivity, and
       * that is exactly what needs to reach the logs.
       */
      console.error("[places] occupations read failed", error);
      return [];
    }
    return data.map((row) => ({
      code: row.code,
      name: row.name,
      category: row.category,
    }));
  } catch (cause) {
    console.error("[places] occupations read threw", cause);
    return [];
  }
});

/** One occupation by code, for rendering a chosen value without the whole list. */
export const readOccupation = cache(async function readOccupation(
  code: string,
): Promise<OccupationOption | null> {
  if (!isSupabaseConfigured() || code.trim().length === 0) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("occupations")
      .select("code, name, category")
      .eq("code", code.trim())
      .maybeSingle();
    if (!data) return null;
    return { code: data.code, name: data.name, category: data.category };
  } catch {
    return null;
  }
});

/** One local government by code, with the state it belongs to. */
export const readLocalGovernment = cache(async function readLocalGovernment(
  code: string,
): Promise<LocalGovernmentOption | null> {
  if (!isSupabaseConfigured() || code.trim().length === 0) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("local_governments")
      .select("code, state_code, name")
      .eq("code", code.trim())
      .maybeSingle();
    if (!data) return null;
    return { code: data.code, stateCode: data.state_code, name: data.name };
  } catch {
    return null;
  }
});
