import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { buildFeed, isFeedToken, type FeedNight } from "@/lib/host/ical";

/**
 * GET /api/calendar/feed?t=<token>: a room's (or listing's) Vallo calendar as
 * iCal, for Airbnb, Booking.com or any calendar app to subscribe to (C2).
 *
 * THE TOKEN IS THE WHOLE KEY. It is 64 hex characters from the database's own
 * random source, made by the host on `/host/calendar` and remade there if it
 * leaks. `public.calendar_feed` answers only for an exact token and returns
 * dates and nothing else: no guest, no price, no booking reference. So the
 * route needs no session, which is why it is on the proxy's open list, and
 * why a wrong token gets the same 404 as a missing one.
 *
 * Until the pending migration is applied the function does not exist and
 * every request is a 404.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound(): NextResponse {
  return new NextResponse("Not found", { status: 404, headers: { "cache-control": "no-store" } });
}

export async function GET(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get("t")?.replace(/\.ics$/i, "") ?? "";
  if (!isFeedToken(token) || !isSupabaseConfigured()) return notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("calendar_feed" as never, { p_token: token } as never);
  if (error || !data) return notFound();
  const body = data as { status?: string; title?: string; nights?: FeedNight[] };
  if (body.status !== "ok") return notFound();
  const nights = (Array.isArray(body.nights) ? body.nights : []).filter(
    (n) => typeof n?.date === "string" && (n.kind === "booked" || n.kind === "closed"),
  );
  const text = buildFeed({ name: body.title ?? "Vallo", token, nights, now: new Date() });
  return new NextResponse(text, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="vallo.ics"',
      "cache-control": "private, max-age=300",
      "x-robots-tag": "noindex",
    },
  });
}
