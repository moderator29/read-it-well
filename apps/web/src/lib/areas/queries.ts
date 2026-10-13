import "server-only";
import { reportReadError } from "@/lib/observability/read-error";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase/env";
import { areaPageRowFromRow, qualifyingPages, type AreaPage, type AreaPageRow } from "./pages";

/**
 * THE LIST OF AREA PAGES THAT MAY EXIST (V-82), read the way a stranger reads.
 *
 * `public.area_price_pages` is SECURITY DEFINER (since 20260924120600, so a
 * stranger can call it without a grant on the private helpers) and returns
 * only names on the closed neighbourhood list and counts, never a listing.
 * It is read here as `anon` with NO COOKIES, literally as a stranger: a
 * crawler, a person and the sitemap all get the same list whoever happens to
 * be signed in on the device asking. A signed-in admin must never see a page
 * exist that a stranger would get a 404 for.
 *
 * NULL IS "WE COULD NOT ASK", distinct from an empty list. The route turns
 * both into a 404 (a page we cannot vouch for is not served), but the sitemap
 * must not be told "no pages" by an outage and then be told "fifty pages" an
 * hour later as if the market moved; it simply lists none that time.
 *
 * Not in the generated database types yet, for the reason
 * `lib/price-check/rpc.ts` gives; the cast is local and names the one
 * function and its one argument.
 */

type PagesRpc = (
  fn: "area_price_pages",
  args: { p_minimum: number },
) => PromiseLike<{ data: unknown; error: unknown }>;

export const areaPricePages = cache(async function areaPricePages(): Promise<AreaPage[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const rpc = supabase.rpc.bind(supabase) as unknown as PagesRpc;
    const { data, error } = await rpc("area_price_pages", { p_minimum: 5 });
    await reportReadError("read.areas.areaPricePages", error);
    if (error || !Array.isArray(data)) return null;
    const rows = (data as Record<string, unknown>[])
      .map(areaPageRowFromRow)
      .filter((row): row is AreaPageRow => row !== null);
    return qualifyingPages(rows);
  } catch {
    return null;
  }
});
