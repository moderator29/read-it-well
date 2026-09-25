import type { PushClient } from "./schema";

/**
 * APNs STAYS SHUT UNTIL THE FOUNDER OPENS IT. V-53.
 *
 * The APNs transport (`transport/apns.ts`) is written, and it needs a .p8 key
 * from the Apple developer account the founder is enrolling. Credentials
 * alone should not be enough to start pushing to iPhones: the first send to
 * a real handset is a launch decision (the permission copy, the App Store
 * build that registers for the production gateway), so it sits behind a
 * fail-closed flag in the pattern of `lib/flags/read.ts`:
 *
 *   no row, a failed read, or enabled = false   ->  shut
 *   a row with enabled = true                   ->  open
 *
 * To open it, once the key is in Vercel and the build is signed:
 *   update public.feature_flags set enabled = true where key = 'native_push_apns';
 * (insert the row first if it does not exist).
 *
 * FCM has no such flag: its keys are on production and Android delivery is
 * the channel the V-53 work is meant to turn on.
 */
export const APNS_FLAG_KEY = "native_push_apns";

export async function apnsIsOpen(admin: PushClient): Promise<boolean> {
  try {
    const { data, error } = await (admin as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { enabled?: unknown } | null; error: unknown }> };
        };
      };
    })
      .from("feature_flags")
      .select("enabled")
      .eq("key", APNS_FLAG_KEY)
      .maybeSingle();
    if (error) return false;
    return data?.enabled === true;
  } catch {
    return false;
  }
}

/** Pure: the platforms the drain may send to, with iOS removed unless opened. */
export function gatePlatforms<P extends string>(platforms: readonly P[], apnsOpen: boolean): P[] {
  return platforms.filter((p) => p !== "ios" || apnsOpen);
}
