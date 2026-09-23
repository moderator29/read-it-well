import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { revokeTokens } from "@/lib/push/revoke";

/**
 * POST /api/push/revoke. A person takes a device back.
 *
 * Without this, push is a permission somebody can grant and cannot withdraw
 * except by uninstalling the application, which is not a setting, it is an
 * ultimatum.
 *
 * RETIRED, NOT DELETED. `revoked_at` and a reason are set. A delete would
 * lose the fact that it was the PERSON who turned it off, which matters:
 * re-registering from that handset is then a deliberate act rather than a
 * bug, and the difference is visible in the row.
 *
 * SCOPED BY `user_id` ON EVERY PATH. The id comes from the request; the owner
 * comes from the session; the update carries both. A person naming somebody
 * else's device id changes nothing and is told the same thing as somebody
 * naming a device that does not exist, because the two answers must not be
 * distinguishable.
 *
 * THE WRITE ITSELF IS IN `lib/push/revoke.ts` AND NOT HERE, because the
 * settings screen retires devices too and two hand-written service-role
 * updates are two chances to leave the ownership filter out. This route reads
 * the session and validates the body; the shared function owns the filter.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.union([
  z.object({ deviceId: z.string().uuid() }),
  /* Sign out everywhere, which is the one a person reaches for when a
     handset is lost. */
  z.object({ all: z.literal(true) }),
]);

export async function POST(request: Request): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "unconfigured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) {
    return NextResponse.json({ ok: false, reason: "signed_out" }, { status: 401 });
  }

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  const outcome = await revokeTokens(user.id, parsed);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, reason: outcome.reason }, { status: 500 });
  }

  /* The count, not the ids. Zero is a truthful answer to both "that device
     was already off" and "that device was never yours". */
  return NextResponse.json({ ok: true, revoked: outcome.revoked }, { status: 200 });
}
