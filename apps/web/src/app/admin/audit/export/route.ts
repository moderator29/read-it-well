import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/admin/audit";
import { safeAuditMetadata } from "@/lib/admin/audit-filter";
import { toCsv, csvHeaders } from "@/lib/admin/csv";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 20_000;

/**
 * GET /admin/audit/export?from=YYYY-MM-DD&to=YYYY-MM-DD: the audit log for a
 * period as CSV, for admins and the compliance scope (regulators ask for it).
 * Metadata passes through the same scrubber the audit desk uses. The export
 * itself is audited, and refused if that row cannot be written.
 */
export async function GET(request: Request): Promise<Response> {
  const access = await requireAdmin("compliance");
  if (access.state !== "admin") return new NextResponse("Not found.", { status: 404 });
  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  if ((from && !DAY.test(from)) || (to && !DAY.test(to))) {
    return new NextResponse("Dates are YYYY-MM-DD.", { status: 400 });
  }
  const fromIso = from ? new Date(`${from}T00:00:00+01:00`).toISOString() : new Date(Date.now() - 30 * 86_400_000).toISOString();
  const toIso = to ? new Date(Date.parse(`${to}T00:00:00+01:00`) + 86_400_000).toISOString() : new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("audit_log")
    .select("created_at, actor_id, action, entity_type, entity_id, metadata")
    .gte("created_at", fromIso)
    .lt("created_at", toIso)
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS);
  if (error) return new NextResponse("The audit log could not be read just now.", { status: 503 });
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.actor_id).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, display_name").in("id", ids);
    for (const p of profiles ?? []) names.set(p.id, p.display_name ?? "");
  }

  const audited = await writeAudit(admin, {
    actorId: access.user.id,
    action: "audit.exported",
    entityType: "audit_log",
    entityId: null,
    detail: { from: fromIso, to: toIso, rows: rows.length },
  });
  if (!audited) return new NextResponse("The export could not be recorded, so it was not sent.", { status: 500 });

  const csv = toCsv(
    ["at", "actor_id", "actor_name", "action", "entity_type", "entity_id", "metadata"],
    rows.map((r) => [
      r.created_at,
      r.actor_id,
      r.actor_id ? (names.get(r.actor_id) ?? "") : "system",
      r.action,
      r.entity_type,
      r.entity_id,
      JSON.stringify(safeAuditMetadata(r.metadata)),
    ]),
  );
  return new Response(csv, {
    status: 200,
    headers: csvHeaders(`vallo-audit-${fromIso.slice(0, 10)}-to-${toIso.slice(0, 10)}${rows.length >= MAX_ROWS ? "-truncated" : ""}.csv`),
  });
}
