import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { writeAuditOrThrow } from "@/lib/admin/audit";
import { csvHeaders } from "@/lib/admin/csv";
import { readAdminMoneyRows } from "@/lib/money/history";
import {
  MONEY_EXPORT_LIMIT,
  exportFilename,
  moneyHistoryCsv,
  parseExportRange,
} from "@/lib/admin/money-export";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /admin/money/export: the platform's payments and refunds as CSV, for the
 * finance scope, with optional `from` and `to` Lagos days (YYYY-MM-DD).
 *
 * THE DOOR IS THE DESK'S DOOR. `requireAdmin("finance")`, and the rows are
 * read with `access.userClient`, the caller's own session, because
 * `admin_money_history` decides by `auth.uid()` and returns nothing to anybody
 * without the scope. The service client never reads these rows.
 *
 * THE AUDIT ROW COMES FIRST AND IS NOT OPTIONAL. The file carries payers' and
 * payees' names beside what they paid, so it is written to the audit log
 * before a byte is sent, and if that write fails the export fails with a 500.
 * The row names the range and the row count and nothing else: the audit log
 * must not become a second copy of the personal data it is guarding. The
 * audit insert uses the service client only because `audit_log` has no insert
 * policy for anybody; that is where the audit trail is written from, always.
 */
export async function GET(request: NextRequest) {
  const access = await requireAdmin("finance");
  if (access.state !== "admin") {
    const status = access.state === "signed-out" ? 401 : access.state === "unconfigured" ? 503 : 403;
    return NextResponse.json({ error: "not allowed" }, { status, headers: { "cache-control": "no-store" } });
  }

  const range = parseExportRange(request.nextUrl.searchParams);
  if (!range.ok) {
    return NextResponse.json({ error: range.reason }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  const rows = await readAdminMoneyRows(access.userClient, {
    limit: MONEY_EXPORT_LIMIT,
    range: { from: range.from, to: range.to },
  });
  if (rows === null) {
    return NextResponse.json(
      { error: "The history could not be read. Nothing was exported." },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    await writeAuditOrThrow(createAdminClient(), {
      actorId: access.user.id,
      action: "money.history_exported",
      entityType: "money_history",
      entityId: null,
      detail: { from: range.fromDay, to: range.toDay, rows: rows.length },
    });
  } catch {
    return NextResponse.json(
      { error: "The export could not be recorded in the audit log, so it was not sent." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }

  return new NextResponse(moneyHistoryCsv(rows), {
    status: 200,
    headers: csvHeaders(exportFilename(range.fromDay, range.toDay)),
  });
}
