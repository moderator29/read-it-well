import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import {
  readActingFor,
  readMyMandate,
  readOwnershipDesk,
  type ActingFor,
  type ActingForKind,
  type MyMandateRead,
  type OwnershipDesk,
} from "./beneficial-ownership";

/**
 * SCUML item 17 reads. Each goes through a definer function that checks its
 * own caller (the lister for their own mandate, staff for the rest), so the
 * client here is the caller's own. The functions are newer than the
 * generated types, hence the untyped client. A failed read is "failed",
 * never an empty answer.
 */

async function loose(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  return (await createClient()) as unknown as SupabaseClient;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The lister's own mandate for one listing. */
export async function readMyListingMandate(listingId: string): Promise<MyMandateRead> {
  if (!UUID.test(listingId)) return { state: "not_yours" };
  try {
    const db = await loose();
    if (!db) return { state: "failed" };
    const { data, error } = await db.rpc("my_listing_mandate", { p_listing: listingId });
    if (error) return { state: "failed" };
    return readMyMandate(data);
  } catch {
    return { state: "failed" };
  }
}

/** Staff: who the lister behind this record was acting for. Audited in the database. */
export async function readActingForRecord(kind: ActingForKind, id: string): Promise<ActingFor> {
  if (!UUID.test(id)) return { state: "no_listing" };
  try {
    const db = await loose();
    if (!db) return { state: "failed" };
    const { data, error } = await db.rpc("acting_for", { p_kind: kind, p_id: id });
    if (error) return { state: "failed" };
    return readActingFor(data);
  } catch {
    return { state: "failed" };
  }
}

/** Staff: the compliance lane's counts and the listings still without a mandate. */
export async function readBeneficialOwnershipDesk(): Promise<OwnershipDesk | null> {
  try {
    const db = await loose();
    if (!db) return null;
    const { data, error } = await db.rpc("beneficial_ownership_desk");
    if (error) return null;
    return readOwnershipDesk(data);
  } catch {
    return null;
  }
}
