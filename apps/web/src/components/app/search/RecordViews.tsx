import "server-only";

import { after } from "next/server";
import { headers } from "next/headers";
import { isPrefetchRequest } from "@/lib/http/prefetch";
import { resolveSession } from "@/lib/actions/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Counts what this signed-in person was SHOWN and what they OPENED (V-73),
 * from the server, with the ids this render actually drew.
 *
 * A server component that renders nothing. It used to be a client component
 * calling a server action with ids of the browser's choosing, which let
 * anybody inflate a listing. Now `public.record_listing_views` is executable
 * by the service role alone, this render is the only caller, and the work runs
 * after the response (`after`) so the page never waits for it. The database
 * de-duplicates per person per day under a salt that lives one day, caps a
 * person at 300 calls a day, and never counts examples or a lister's own
 * listings. Without a service-role key (a local build) nothing is counted,
 * which is the honest failure.
 */
export async function RecordViews({ seen = [], opened = null }: { seen?: string[]; opened?: string | null }) {
  const ids = seen.slice(0, 20);
  if (ids.length === 0 && !opened) return null;
  /* A prefetch (a hovered card, a link scrolled into view) is nobody looking. */
  const requestHeaders = await headers();
  if (isPrefetchRequest((name) => requestHeaders.get(name))) return null;
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const viewer = session.user.id;
  after(async () => {
    try {
      await (
        createAdminClient() as unknown as {
          rpc: (fn: string, args: object) => Promise<{ error: unknown }>;
        }
      ).rpc("record_listing_views", { p_viewer: viewer, p_seen: ids, p_opened: opened });
    } catch {
      /* Not counted is the honest outcome of a count that failed. */
    }
  });
  return null;
}
