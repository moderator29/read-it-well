import "server-only";
import { reportError } from "@/lib/observability/report";
import { reportReadError } from "@/lib/observability/read-error";

import { resolveSession } from "@/lib/actions/session";

/**
 * When this account confirmed its phone, from the same row `/settings/phone`
 * reads (`confirmed_phones`, the member's own, under their RLS). The passport's
 * RPC says the phone is confirmed but not when, and a trust fact is a date, so
 * the date is read here. Null when unknown or unreadable: the fact is then
 * shown without a date and never with an invented one.
 */
export async function readPhoneConfirmedAt(): Promise<string | null> {
  try {
    const session = await resolveSession();
    if (session.state !== "signed-in") return null;
    const { data, error } = await (session.supabase as unknown as {
      from(t: string): {
        select(c: string): {
          eq(c: string, v: string): {
            maybeSingle(): Promise<{ data: { confirmed_at: string } | null; error: unknown }>;
          };
        };
      };
    })
      .from("confirmed_phones")
      .select("confirmed_at")
      .eq("user_id", session.user.id)
      .maybeSingle();
    await reportReadError("read.passport.readPhoneConfirmedAt", error);
    return data?.confirmed_at ?? null;
  } catch (error) {
    await reportError({ error, context: { kind: "read.passport_phone" } });
    return null;
  }
}
