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

/*
 * A RELATIVE Location, found by the live proof on 23 September. Built from
 * `request.url`, the redirect named the host the server believes it is
 * (`localhost` behind `next start`) rather than the one the browser used, so
 * a browser on 127.0.0.1 or behind a proxy landed on another origin without
 * its session and was sent to sign in. A path-only Location resolves against
 * the address the browser actually asked.
 */
function seeOther(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = await requireAdmin();
  if (access.state !== "admin") return seeOther("/admin");
  const target = enterTarget(request.nextUrl.searchParams.get("next"));
  const response = seeOther(target);
  response.cookies.set(ENTRY_COOKIE, access.user.id, ENTRY_COOKIE_OPTIONS);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
