import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import { cache } from "react";
import { createClient } from "../supabase/server";
import { isSupabaseConfigured } from "../supabase/env";
import {
  areaCensusFromRow,
  areaRowFromRow,
  comparableFromRow,
  shareFromRow,
  suggestionFromRow,
  supplyFromRow,
  utilityFactsFromRow,
  verdictFromRow,
} from "./mapping";
import { priceCheckRpc, selectPriceCheckShare } from "./rpc";
import type {
  AreaAskingRow,
  AreaCensus,
  AreaShare,
  AreaSuggestion,
  AreaUtilityFacts,
  Comparable,
  GateVerdict,
  ListingIntent,
  ListingPropertyType,
  PriceCheckSubject,
  SupplyCensus,
} from "./types";

/**
 * THE READS BEHIND PRICE CHECK.
 *
 * Every one of them is an RPC that is NOT security definer, so RLS decides
 * what the caller sees exactly as it does for a direct select, and the
 * column-list grant on `public.listings` decides which columns a signed-out
 * reader gets. Measured against the live estate: `anon` holds SELECT on every
 * column these functions touch and holds NO grant on `address` or `landmark`.
 * The share rule is therefore enforced at the grant before any code runs.
 *
 * ---------------------------------------------------------------------------
 * FAILURE IS ALWAYS A REFUSAL, NEVER AN EXCEPTION.
 *
 * Every function here degrades into "we could not find anything" rather than
 * into a page that will not render. That is the house pattern
 * (`lib/places/queries.ts` says the same about its reference reads) and it
 * matters more here than usual, because this feature's whole job is to be
 * honest about what it does not know. A screen that crashes when the database
 * is unreachable tells the reader less than one that refuses.
 *
 * THE ONE THING THAT MUST NOT HAPPEN is a refusal that LOOKS like a gate
 * refusal when it was really a broken connection: "we have nothing published
 * near here" is a claim about our data, and making it because a query threw
 * would be exactly the invented statement this feature exists to avoid. So
 * every read returns `null` on failure, distinct from an empty answer, and the
 * caller prints the unreachable copy rather than a refusal code.
 */

type Db = Awaited<ReturnType<typeof createClient>>;

async function client(): Promise<Db | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    return await createClient();
  } catch {
    return null;
  }
}

/*
 * The row mapping lives in `mapping.ts` and is tested there.
 *
 * POSTGREST SENDS EVERY bigint AS A STRING, and every money column in this
 * feature is a bigint holding integer kobo. A string reaching `Amount` renders
 * NaN, and that defect is invisible today for the same reason the SQL bug in
 * `20260922223411_...` was invisible: the gate refuses every call on this
 * estate, so the branch carrying the figures is never taken. Pulling the
 * coercion out of these closures is what let it be put under test.
 */

/* ------------------------------------------------------------- the gate */

/**
 * The verdict for one subject. Null means we could not ask, which is a
 * different thing from an answer of no.
 */
export const runGate = cache(async function runGate(
  lat: number,
  lng: number,
  propertyType: ListingPropertyType,
  intent: ListingIntent,
  bedrooms: number | null,
  sizeSqm: number | null,
  excludeListingId: string | null,
): Promise<GateVerdict | null> {
  const supabase = await client();
  if (!supabase) return null;
  try {
    const { data, error } = await priceCheckRpc(supabase, "estimate_value", {
      p_lat: lat,
      p_lng: lng,
      p_property_type: propertyType,
      p_intent: intent,
      p_bedrooms: bedrooms,
      p_size_sqm: sizeSqm,
      p_exclude_id: excludeListingId,
    });
    await reportReadError("read.price-check.runGate", error);
    if (error || !data) return null;
    return verdictFromRow(
      (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined,
    );
  } catch {
    return null;
  }
});

/**
 * Real, example and over-a-year-old listings near a point, counted apart.
 *
 * THE REASON THIS EXISTS: `is_demo = false` sits inside the comparables
 * predicate, so the gate cannot tell "nothing here", "nothing here but
 * examples" and "nothing here that is recent" apart. All three come back as
 * zero rows. Printing the wrong one is printing a guess about our own data,
 * and one of them is the state 100 per cent of checks are in today.
 */
export const supplyNear = cache(async function supplyNear(
  lat: number,
  lng: number,
  propertyType: ListingPropertyType,
  intent: ListingIntent,
  bedrooms: number | null,
): Promise<SupplyCensus | null> {
  const supabase = await client();
  if (!supabase) return null;
  try {
    const { data, error } = await priceCheckRpc(supabase, "comparable_supply_near", {
      p_lat: lat,
      p_lng: lng,
      p_property_type: propertyType,
      p_intent: intent,
      p_bedrooms: bedrooms,
      p_radius_m: 3000,
    });
    await reportReadError("read.price-check.supplyNear", error);
    if (error || !data) return null;
    return supplyFromRow(
      (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined,
    );
  } catch {
    return null;
  }
});

/** The comparables that produced a figure, in the order the gate ranked them. */
export const comparablesFor = cache(async function comparablesFor(
  lat: number,
  lng: number,
  propertyType: ListingPropertyType,
  intent: ListingIntent,
  bedrooms: number | null,
  radiusM: number,
): Promise<Comparable[]> {
  const supabase = await client();
  if (!supabase) return [];
  try {
    const { data, error } = await priceCheckRpc(supabase, "comparable_listings", {
      p_lat: lat,
      p_lng: lng,
      p_property_type: propertyType,
      p_intent: intent,
      p_bedrooms: bedrooms,
      p_radius_m: radiusM,
      p_max_age_days: 365,
      p_exclude_id: null,
      p_limit: 24,
    });
    await reportReadError("read.price-check.comparablesFor", error);
    if (error || !data || !Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map(comparableFromRow);
  } catch {
    return [];
  }
});

/* ----------------------------------------------------- the area report */

/**
 * What properties of each type and bedroom count in one area are ASKING.
 *
 * THIS IS WHAT STAGE ONE ACTUALLY IS. Three listings rather than five, because
 * the claim is weaker: "three two-bed flats in Yaba are asking between X and
 * Y" is a true statement about three listings and not an estimate of anything.
 * Every row carries its count and its date range so the surface can print
 * "based on 3 listings, published between March and August 2026" beside every
 * figure. That sentence is the whole product today.
 */
export const areaAsking = cache(async function areaAsking(
  stateCode: string,
  city: string | null,
  area: string | null,
  intent: ListingIntent,
  propertyType: ListingPropertyType | null,
  bedrooms: number | null,
): Promise<AreaAskingRow[] | null> {
  const supabase = await client();
  if (!supabase) return null;
  try {
    const { data, error } = await priceCheckRpc(supabase, "area_asking_summary", {
      p_state_code: stateCode,
      p_city: city,
      p_area: area,
      p_property_type: propertyType,
      p_intent: intent,
      p_bedrooms: bedrooms,
      p_max_age_days: 540,
    });
    await reportReadError("read.price-check.areaAsking", error);
    if (error || !data || !Array.isArray(data)) return null;
    return (data as Record<string, unknown>[]).map(areaRowFromRow);
  } catch {
    return null;
  }
});

/** Why the area report has nothing: nothing here, or nothing but examples. */
export const areaCensus = cache(async function areaCensus(
  stateCode: string,
  city: string | null,
  area: string | null,
  intent: ListingIntent,
): Promise<AreaCensus | null> {
  const supabase = await client();
  if (!supabase) return null;
  try {
    const { data, error } = await priceCheckRpc(supabase, "area_supply_census", {
      p_state_code: stateCode,
      p_city: city,
      p_area: area,
      p_intent: intent,
    });
    await reportReadError("read.price-check.areaCensus", error);
    if (error || !data) return null;
    return areaCensusFromRow(
      (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined,
    );
  } catch {
    return null;
  }
});

/**
 * The neighbourhood power and water facts, which need no prices at all.
 *
 * Nobody else in this market collects these structurally per listing, and this
 * panel is why stage one carries real value on a day when every price answer
 * refuses. Example listings are excluded for the same reason the prices
 * exclude them: an example listing's power supply is fiction.
 */
export const utilityFacts = cache(async function utilityFacts(
  stateCode: string,
  city: string | null,
  area: string | null,
): Promise<AreaUtilityFacts | null> {
  const supabase = await client();
  if (!supabase) return null;
  try {
    const { data, error } = await priceCheckRpc(supabase, "area_utility_facts", {
      p_state_code: stateCode,
      p_city: city,
      p_area: area,
    });
    await reportReadError("read.price-check.utilityFacts", error);
    if (error || !data) return null;
    return utilityFactsFromRow(
      (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined,
    );
  } catch {
    return null;
  }
});

/**
 * Rung three of the ladder: the only neighbourhood vocabulary we hold.
 *
 * KEYED ON STATE AND NOT ON LGA, and that is a data fact rather than a choice.
 * `public.listings` carries `state_code`, `city` and `area` and has no
 * `lga_code` column at all, so there is nothing to join a local government to.
 * The ladder still asks for the LGA, because it is what a person knows and it
 * is what the funnel records; it simply cannot narrow this list until a
 * listing carries one.
 */
export const areaSuggestions = cache(async function areaSuggestions(
  stateCode: string,
  query: string | null,
): Promise<AreaSuggestion[]> {
  const supabase = await client();
  if (!supabase) return [];
  try {
    const { data, error } = await priceCheckRpc(supabase, "area_suggestions", {
      p_state_code: stateCode,
      p_query: query,
      p_limit: 8,
    });
    await reportReadError("read.price-check.areaSuggestions", error);
    if (error || !data || !Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map(suggestionFromRow);
  } catch {
    return [];
  }
});

/**
 * Everything one per-property check needs, in the fewest round trips.
 *
 * The census is fetched ALONGSIDE the verdict rather than after it, because
 * the verdict alone cannot say which refusal to print and a second round trip
 * to find out would double the latency of the most common outcome on this
 * platform, which is a refusal.
 */
export async function runPriceCheck(subject: PriceCheckSubject): Promise<{
  verdict: GateVerdict | null;
  supply: SupplyCensus | null;
  reachable: boolean;
}> {
  if (subject.lat === null || subject.lng === null) {
    return { verdict: null, supply: null, reachable: true };
  }
  const [verdict, supply] = await Promise.all([
    runGate(
      subject.lat,
      subject.lng,
      subject.propertyType,
      subject.intent,
      subject.bedrooms,
      subject.sizeSqm,
      subject.fromListingId,
    ),
    supplyNear(
      subject.lat,
      subject.lng,
      subject.propertyType,
      subject.intent,
      subject.bedrooms,
    ),
  ]);
  /* Both null is the only shape that means "we could not ask". One null and
     one answer is a partial read, and the caller degrades to the refusal the
     verdict supports rather than inventing a census. */
  return { verdict, supply, reachable: verdict !== null || supply !== null };
}


/* ------------------------------------------------------------ the card */

/**
 * ONE SHARE CARD BY ID, READ THE WAY A STRANGER READS IT.
 *
 * THROUGH THE CALLER'S OWN CLIENT, NEVER THE SERVICE ROLE ONE, even though
 * every row in this table is meant to be public. The service-role client
 * bypasses RLS and the column grants together, so a read through it would come
 * back with `created_by` on it and would keep working if the policy were ever
 * tightened - a page that renders under a permission nobody actually holds. A
 * read through the caller's client is exactly what a person following a
 * forwarded link gets, and if that stops working the page stops working, which
 * is the correct failure.
 *
 * NULL COVERS THREE DIFFERENT THINGS AND THE PAGE SAYS WHICH. A card that was
 * never minted, a card whose id was mistyped and a database we could not reach
 * all arrive here as null. The destination answers "this card is not here" for
 * all three, because it cannot tell them apart and guessing which would be a
 * claim about our own data. Read the header of this file: a refusal that looks
 * like a gate refusal when it was really a broken connection is the one thing
 * this feature may not do.
 */
export const shareById = cache(async function shareById(id: string): Promise<AreaShare | null> {
  const supabase = await client();
  if (!supabase) return null;
  try {
    const { data, error } = await selectPriceCheckShare(supabase, id);
    await reportReadError("read.price-check.shareById", error);
    if (error || data === null || typeof data !== "object") return null;
    return shareFromRow(data as Record<string, unknown>);
  } catch {
    return null;
  }
});
