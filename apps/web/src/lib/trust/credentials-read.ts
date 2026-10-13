import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";
import type { CredentialKind, ProofFacts } from "./proof-strip";

/**
 * V-87: the lister's credential checks from the last year, from
 * `public.listing_credentials` (kind, number, register name or company, date; never who
 * checked). An empty list on any failure: a missing credential draws nothing.
 */
const KINDS: readonly CredentialKind[] = ["lasrera", "esvarbon", "cac_director"];

export async function readListingCredentials(listingId: string): Promise<NonNullable<ProofFacts["credentials"]>> {
  try {
    const supabase = (await createClient()) as unknown as SupabaseClient;
    const { data, error } = await supabase
      .from("listing_credentials")
      .select("kind, number, company_name, register_name, checked_at")
      .eq("listing_id", listingId);
    await reportReadError("read.credentials.readListingCredentials", error);
    if (error || !Array.isArray(data)) return [];
    return (
      data as {
        kind: string;
        number: string;
        company_name: string | null;
        register_name: string | null;
        checked_at: string;
      }[]
    )
      .filter((row) => (KINDS as readonly string[]).includes(row.kind))
      .map((row) => ({
        kind: row.kind as CredentialKind,
        number: row.number,
        company: row.company_name,
        registerName: row.register_name,
        checkedAt: row.checked_at,
      }));
  } catch {
    return [];
  }
}
