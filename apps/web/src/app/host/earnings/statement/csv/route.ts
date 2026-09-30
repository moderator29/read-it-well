import { NextResponse } from "next/server";
import { parseMonth } from "@/lib/host/rate-calendar";
import { readMonthEarnings } from "@/lib/host/statement-read";
import { statementCsv, statementLines } from "@/lib/host/statement";

/**
 * GET /host/earnings/statement/csv?month=YYYY-MM: one month's payout
 * statement as CSV (C9). Read only, under the host's own session; the same
 * lines the statement page draws. A read that could not finish says so with
 * a 503 rather than handing over a statement with lines missing.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const month = parseMonth(new URL(request.url).searchParams.get("month"));
  if (!month) return new NextResponse("Pick a month.", { status: 400 });
  const read = await readMonthEarnings(month);
  if (read.state === "signed-out") return new NextResponse("Sign in to download your statement.", { status: 401 });
  if (read.state === "error" || !read.complete) {
    return new NextResponse("Your statement could not be read in full just now. Nothing was downloaded. Try again in a moment.", { status: 503 });
  }
  const csv = statementCsv(statementLines(read.entries, month));
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="vallo-statement-${month}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
