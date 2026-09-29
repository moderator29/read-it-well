import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSession } from "@/lib/actions/session";
import { buildDataExport, type ExportClient } from "@/lib/account/export";
import { consume } from "@/lib/security/rate-limit";

/**
 * OPS-12: GET a JSON copy of what Vallo holds about the signed-in member.
 * `lib/account/export.ts` decides what is in it and why every read is the
 * member's own. `no-store`, because the body is personal data and no cache,
 * shared or private, should keep a copy.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET(): Promise<NextResponse> {
  const session = await resolveSession();
  if (session.state !== "signed-in") {
    return NextResponse.json(
      { error: "Sign in to download your data." },
      { status: session.state === "unconfigured" ? 503 : 401, headers: NO_STORE },
    );
  }

  /* A whole-account read is the heaviest thing a member can ask for, so three
     an hour per account. */
  const paced = await consume({ bucket: "data_export", subject: `user:${session.user.id}`, limit: 3, windowSeconds: 3_600 });
  if (!paced.allowed) {
    return NextResponse.json(
      { error: `You have asked for your data a few times just now. Try again ${paced.retryIn}.` },
      { status: 429, headers: { ...NO_STORE, "retry-after": String(paced.retryAfterSeconds) } },
    );
  }

  let ownRecords: ExportClient;
  try {
    ownRecords = createAdminClient() as unknown as ExportClient;
  } catch {
    ownRecords = session.supabase as unknown as ExportClient;
  }
  const data = await buildDataExport(session.supabase as unknown as ExportClient, session.user, new Date(), ownRecords);
  const day = data.generatedAt.slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      ...NO_STORE,
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="vallo-data-${day}.json"`,
      "x-content-type-options": "nosniff",
    },
  });
}
