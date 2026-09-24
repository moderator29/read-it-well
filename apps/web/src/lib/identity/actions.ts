"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, validate, type ActionResult } from "../actions/envelope";
import { NOT_CONFIGURED_MESSAGE, SIGNED_OUT_MESSAGE, resolveSession } from "../actions/session";
import { consume, subjectForUser } from "../security/rate-limit";
import { hasServiceRole } from "../security/service-rpc";
import { createAdminClient } from "../supabase/admin";
import { vninIdentityOn } from "./flag";
import { ninHmac } from "./nin";
import { identityProvider } from "./provider";
import { runVninCheck, type VninOutcome } from "./vnin-check";

/**
 * CONFIRM IDENTITY WITH A VIRTUAL NIN (V-49). Closed unless `vnin_identity`
 * is on, the service role is present and the HMAC key is set; each of those
 * missing is a sentence, never an attempt. Three attempts a day per person:
 * each is a paid lookup, and the check is the kind of door people lean on.
 */

const CLOSED = "Confirming with a NIN is not open at the moment. Upload your ID document instead.";

const REFUSED: Record<Extract<VninOutcome, { status: "refused" }>["reason"], string> = {
  invalid_token: "A virtual NIN is sixteen letters and numbers. Check it and try again.",
  unconfigured: CLOSED,
  not_found: "NIMC did not recognise that virtual NIN. Generate a new one and try again.",
  expired: "That virtual NIN has expired. Generate a new one and try again.",
  failed: "We could not complete the check just now. Nothing was recorded. Try again in a moment.",
  no_agent: "Only an approved lister can confirm identity here.",
  other_nin: "Your account is already matched to a different NIN. One NIN confirms one person, so nothing was changed.",
  unchanged: "Your identity is already matched. This check did not match the name on your application, so nothing was changed.",
};

const PENDING =
  "Thank you. The check did not settle it on its own, so a person on our team will look at it and tell you.";

const schema = z.object({ vnin: z.string().trim().min(1, "Enter your virtual NIN.") });

type Loose = {
  from(t: string): {
    select(c: string): {
      eq(c: string, v: string): {
        order(c: string, o: { ascending: boolean }): {
          limit(n: number): { maybeSingle(): Promise<{ data: { full_name: string | null } | null }> };
        };
      };
    };
  };
};
type RpcCaller = { rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: unknown }> };

export async function verifyIdentityWithVnin(
  input: unknown,
): Promise<ActionResult<{ status: "passed" | "pending"; message: string }>> {
  const session = await resolveSession();
  if (session.state === "unconfigured") return fail(NOT_CONFIGURED_MESSAGE);
  if (session.state === "signed-out") return fail(SIGNED_OUT_MESSAGE);
  if (!(await vninIdentityOn())) return fail(CLOSED);
  const key = process.env.VALLO_NIN_HMAC_KEY ?? "";
  if (!hasServiceRole() || key.length < 32) return fail(CLOSED);

  const parsed = validate(schema, input);
  if (!parsed.ok) return fail(parsed.error, parsed.fieldErrors);

  const verdict = await consume({
    bucket: "vnin_check",
    subject: subjectForUser(session.user.id),
    limit: 3,
    windowSeconds: 86_400,
  });
  if (!verdict.allowed || verdict.degraded) {
    return fail("That is three checks today. Try again tomorrow, or upload your ID document instead.");
  }

  const { data: application } = await (session.supabase as unknown as Loose)
    .from("agent_applications")
    .select("full_name")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const applicationName = application?.full_name?.trim() ?? "";
  if (applicationName === "") return fail(REFUSED.no_agent);

  const admin = createAdminClient() as unknown as RpcCaller;
  const outcome = await runVninCheck(
    {
      provider: identityProvider(),
      hmac: (nin) => ninHmac(nin, key),
      record: async (r) => {
        const { data, error } = await admin.rpc("record_vnin_check", {
          p_user: r.userId,
          p_legal_name: r.legalName,
          p_nin_hmac: r.ninHmac,
          p_provider_ref: r.reference,
          p_matched: r.matched,
          p_note: r.note,
        });
        if (error || typeof data !== "string") throw new Error("record failed");
        return data;
      },
    },
    { userId: session.user.id, vnin: parsed.data.vnin, applicationName },
  );

  if (outcome.status === "refused") return fail(REFUSED[outcome.reason]);
  revalidatePath("/verification");
  return ok(
    outcome.status === "passed"
      ? { status: "passed", message: "Your identity was matched with NIMC. The next check is your address." }
      : { status: "pending", message: PENDING },
  );
}
