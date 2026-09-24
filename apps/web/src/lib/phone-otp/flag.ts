import "server-only";

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";

/**
 * `feature_flags.phone_confirmation`, read per request and FAILING CLOSED,
 * the pattern of `lib/escrow/flag.ts`: no row, a failed read or no
 * configuration all mean off. Off, nothing asks for a phone anywhere.
 *
 * To turn it on, once a code transport is wired (founder question 7):
 *   update public.feature_flags set enabled = true where key = 'phone_confirmation';
 */
export const PHONE_FLAG_KEY = "phone_confirmation";

export async function phoneConfirmationOn(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", PHONE_FLAG_KEY)
      .maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}
