import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { ENTRY_COOKIE, ENTRY_COOKIE_OPTIONS, enterTarget } from "../_components/entry";

/**
 * `/admin/enter?next=<target>`: enters the console on the server (R-E with
 * JavaScript off). An admin gets the entry cookie, with the attributes the
 * browser uses in `EntryGate`, and a 303 to the overview, bare or carrying
 * the desk (`enterTarget` never answers a desk itself, R-E); anyone else
 * gets a 303 to `/admin`, whose layout explains why they cannot come in. It
 * reads and writes nothing in the database beyond the role check.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireAdmin();
  if (access.state !== "admin") return NextResponse.redirect(new URL("/admin", request.url), 303);
  const target = enterTarget(request.nextUrl.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(target, request.url), 303);
  response.cookies.set(ENTRY_COOKIE, access.user.id, ENTRY_COOKIE_OPTIONS);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
