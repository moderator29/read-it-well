import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePurchases, type PromotionPurchase } from "./my-purchases";
import { reportReadFault } from "@/lib/observability/read-error";

type Rpc = { rpc: (fn: string) => PromiseLike<{ data: unknown; error: unknown }> };

/** `null` means the read failed; an empty list means there is nothing to show. */
export async function readMyPromotionPurchases(supabase: SupabaseClient): Promise<PromotionPurchase[] | null> {
  try {
    const { data, error } = await (supabase as unknown as Rpc).rpc("promotion_my_purchases");
    await reportReadFault("read.promotion.my_purchases", error);
    if (error) return null;
    return parsePurchases(data);
  } catch {
    return null;
  }
}
