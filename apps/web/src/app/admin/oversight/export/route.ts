import { NextResponse } from "next/server";
import { writeAudit } from "@/lib/admin/audit";
import { toCsv, csvHeaders } from "@/lib/admin/csv";
import { requireAdmin } from "@/lib/admin/guard";
import { readOversight } from "@/lib/admin/oversight";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /admin/oversight/export?kind=backlog|throughput: the oversight tables as
 * CSV, for the admins and the operations scope. Every export is audited, and
 * an export whose audit row cannot be written is refused.
 */
export async function GET(request: Request): Promise<Response> {
  const access = await requireAdmin("operations");
  if (access.state !== "admin") return new NextResponse("Not found.", { status: 404 });
  const kind = new URL(request.url).searchParams.get("kind") === "throughput" ? "throughput" : "backlog";
  const read = await readOversight();
  if (read.state !== "ok") return new NextResponse("The figures could not be read just now.", { status: 503 });

  const audited = await writeAudit(createAdminClient(), {
    actorId: access.user.id,
    action: "oversight.exported",
    entityType: "oversight",
    entityId: null,
    detail: { kind },
  });
  if (!audited) return new NextResponse("The export could not be recorded, so it was not sent.", { status: 500 });

  const day = new Date().toISOString().slice(0, 10);
  const csv =
    kind === "backlog"
      ? toCsv(
          ["queue", "desk", "waiting", "oldest_waiting_since"],
          read.backlog.map((r) => [r.queue, r.scope, r.waiting, r.oldestAt]),
        )
      : toCsv(
          ["staff_member", "actions_30_days", "last_action_at", "actions_by_kind"],
          read.throughput.map((r) => [
            r.name,
            r.total,
            r.lastAt,
            Object.entries(r.byAction)
              .map(([a, n]) => `${a}:${n}`)
              .join("; "),
          ]),
        );
  return new Response(csv, { status: 200, headers: csvHeaders(`vallo-${kind}-${day}.csv`) });
}
