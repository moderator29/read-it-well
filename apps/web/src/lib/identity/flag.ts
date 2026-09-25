import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * `feature_flags.vnin_identity`, fail closed (the `lib/flags/read.ts`
 * pattern). To turn it on, once an aggregator is contracted (founder
 * question 4) and VALLO_NIN_HMAC_KEY is set:
 *   update public.feature_flags set enabled = true where key = 'vnin_identity';
 */
export async function vninIdentityOn(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "vnin_identity")
      .maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}
