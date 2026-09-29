import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { ingestList } from "@/lib/compliance/sanctions/ingest";
import { uploadSource } from "@/lib/compliance/sanctions/sources";
import { getAdminClient } from "@/lib/supabase/service";
import { siteUrl } from "@/lib/site";

/**
 * POST /api/compliance/sanctions-upload. SCUML items 8 and 9.
 *
 * A staff member loads a sanctions list file from the desk. A route handler
 * rather than a server action, so the platform's server-action body limit
 * stays at its default and only this door takes a larger body:
 *   - `requireAdmin` runs BEFORE the body is read, so nobody else gets a
 *     byte of it parsed;
 *   - the declared length is refused above 4 MB before reading, and the file
 *     itself is checked again after;
 *   - a request whose Origin is not this site's is refused (a staff member's
 *     cookie must not load a list from another page).
 * The version loads INACTIVE; a different staff member activates it on the
 * desk (`sanctions_list_activate`). A file that does not prove it is whole
 * (a Nigeria file with no END row) is answered `incomplete`: it can never be
 * activated, so it is not "waiting".
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
/* Multipart framing around the file. */
const FRAMING = 64 * 1024;

type Answer = { ok: true; message: string } | { ok: false; error: string };

/** Same site only: the Origin must be this deployment's (or the request's own) origin. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    /* no request origin */
  }
  try {
    allowed.add(new URL(siteUrl()).origin);
  } catch {
    /* no configured site */
  }
  return allowed.has(origin);
}

export async function POST(request: Request): Promise<NextResponse<Answer>> {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  const access = await requireAdmin("compliance");
  if (access.state !== "admin") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const declared = Number(request.headers.get("content-length") ?? "");
  if (!Number.isFinite(declared) || declared <= 0 || declared > MAX_UPLOAD_BYTES + FRAMING) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 400 });
  }
  const source = form.get("source");
  const file = form.get("file");
  if ((source !== "un" && source !== "ng") || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "failed" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "failed" }, { status: 503 });
  const result = await ingestList(admin as never, uploadSource(source, await file.text()), access.user.id);
  revalidatePath("/admin/compliance");
  /* Loaded but never activatable (a Nigeria file with no END row): say so, never "waiting". */
  if (result.state === "waiting" && result.why === "unverified") {
    return NextResponse.json({ ok: false, error: "incomplete" }, { status: 422 });
  }
  if (result.state === "waiting") return NextResponse.json({ ok: true, message: `waiting:${result.entries}` });
  if (result.state === "loaded") return NextResponse.json({ ok: true, message: `loaded:${result.entries}` });
  if (result.state === "same") return NextResponse.json({ ok: true, message: "same" });
  return NextResponse.json({ ok: false, error: "failed" }, { status: 422 });
}
