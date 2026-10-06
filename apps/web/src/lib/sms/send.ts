import "server-only";

import { otpTransport } from "../phone-otp/transport";
import { hasServiceRole } from "../security/service-rpc";
import { createAdminClient } from "../supabase/admin";
import { sendNotificationSms, type SmsOutcome } from "./core";

/**
 * Send one notification SMS, server-side, as the channel policy permits.
 * Carried on the same Termii transport as the authentication codes
 * (`otpTransport()`), WhatsApp first where enabled, then the DND route.
 * Never throws; the outcome says why nothing was sent.
 */

type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> };
    };
  };
};

export async function sendSmsFor(input: { userId: string; event: string; text: string }): Promise<SmsOutcome> {
  if (!hasServiceRole()) return { sent: false, reason: "transport_unconfigured" };
  try {
    const admin = createAdminClient() as unknown as Loose;
    return await sendNotificationSms(
      {
        transport: otpTransport(),
        async confirmedPhone(userId) {
          const { data, error } = await admin.from("confirmed_phones").select("phone").eq("user_id", userId).maybeSingle();
          if (error) throw new Error("read failed");
          const phone = (data as { phone?: unknown } | null)?.phone;
          return typeof phone === "string" ? phone : null;
        },
        async settings(userId) {
          const { data, error } = await admin.from("profiles").select("settings").eq("id", userId).maybeSingle();
          if (error) throw new Error("read failed");
          return (data as { settings?: unknown } | null)?.settings ?? null;
        },
      },
      input,
    );
  } catch {
    return { sent: false, reason: "read_failed" };
  }
}
