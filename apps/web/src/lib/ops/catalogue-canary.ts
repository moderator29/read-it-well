import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { JobVerdict } from "../bookings/lifecycle";
import type { AdminClient } from "../cron/rpc";
import { LISTING_SELECTS } from "../listings/supabase-repository";
import { withPublicPoint } from "../supabase/public-point";
import type { Database } from "../supabase/database.types";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "../supabase/env";

/** The card select as a signed-out reader issues it. Exported for its test. */
export const CANARY_CARD_SELECT = withPublicPoint(LISTING_SELECTS.card);

/**
 * V-01 / OPS-03: the catalogue canary. Find out before the founder does.
 *
 * The 11.5-hour outage of 22 to 23 September was a grant: the catalogue was
 * refused to `anon` and `authenticated` while every health check, all of them
 * run with the service role, stayed green. So this asks the question as the
 * role the product asks it as, and compares against the service role as the
 * control, which is exactly how the outage was finally proved ("control=64
 * anon_all=64"):
 *
 *   control  published listings the SERVICE ROLE counts (RLS bypassed)
 *   public   the same count through the PUBLISHABLE key, no session (RLS on)
 *   card     one row of the real catalogue card select (`LISTING_SELECTS.card`)
 *            as that same caller, which is what fails when a column is added
 *            without its grant (incident 3) or a policy helper loses EXECUTE
 *
 * It fails when either read errors, when the public count is lower than the
 * control, or when the control itself is zero (a catalogue with nothing
 * published is an outage for a marketplace, whatever caused it). A refused or
 * short read is a critical `canary.catalogue` alert, which `lib/alerts/record.ts`
 * sends to Sentry and to a person (`lib/ops/page.ts`); an empty catalogue pages
 * once on the transition and is a warning after that (`emptyAlreadyRaised`).
 *
 * `probeCatalogue` is shared with the public `/api/health/catalogue` route,
 * which an EXTERNAL uptime monitor polls, so the same check still reaches a
 * person when this app, and therefore this cron, is down.
 */
export type CatalogueProbe = {
  ok: boolean;
  control: number | null;
  visible: number | null;
  cardRead: boolean;
  code: string | null;
  reason: "ok" | "not_configured" | "control_failed" | "public_read_failed" | "card_read_failed" | "fewer_visible" | "empty";
};

type Reader = Pick<ReturnType<typeof createSupabaseClient<Database>>, "from">;

function publicClient(): Reader {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function codeOf(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && code.length > 0 ? code : "error";
}

async function publishedCount(client: Reader): Promise<{ count: number | null; error: unknown }> {
  const { count, error } = await client
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "PUBLISHED");
  return { count: count ?? null, error };
}

/**
 * The check itself. `admin` is the control; pass `null` from the public
 * health route, which then judges the public read alone (errors and zero).
 */
export async function probeCatalogue(admin: AdminClient | null, reader?: Reader): Promise<CatalogueProbe> {
  if (!isSupabaseConfigured() && !reader) {
    return { ok: false, control: null, visible: null, cardRead: false, code: null, reason: "not_configured" };
  }
  const client = reader ?? publicClient();

  let control: number | null = null;
  if (admin) {
    try {
      const res = await publishedCount(admin as unknown as Reader);
      if (res.error) {
        return { ok: false, control: null, visible: null, cardRead: false, code: codeOf(res.error), reason: "control_failed" };
      }
      control = res.count ?? 0;
    } catch (error) {
      return { ok: false, control: null, visible: null, cardRead: false, code: codeOf(error), reason: "control_failed" };
    }
  }

  let visible: number;
  try {
    const res = await publishedCount(client);
    if (res.error) {
      return { ok: false, control, visible: null, cardRead: false, code: codeOf(res.error), reason: "public_read_failed" };
    }
    visible = res.count ?? 0;
  } catch (error) {
    return { ok: false, control, visible: null, cardRead: false, code: codeOf(error), reason: "public_read_failed" };
  }

  try {
    const { error } = await client
      .from("listings")
      /* NEW-A4-01: this is the signed-out card read, so it names the public
         point, exactly as the repository does for a reader with no session. */
      .select(CANARY_CARD_SELECT)
      .eq("status", "PUBLISHED")
      .limit(1);
    if (error) {
      return { ok: false, control, visible, cardRead: false, code: codeOf(error), reason: "card_read_failed" };
    }
  } catch (error) {
    return { ok: false, control, visible, cardRead: false, code: codeOf(error), reason: "card_read_failed" };
  }

  if (control !== null && visible < control) {
    return { ok: false, control, visible, cardRead: true, code: null, reason: "fewer_visible" };
  }
  if ((control ?? visible) === 0) {
    return { ok: false, control, visible, cardRead: true, code: null, reason: "empty" };
  }
  return { ok: true, control, visible, cardRead: true, code: null, reason: "ok" };
}

/** The title `recordAlert` gives `canary.catalogue_empty` (see `alertTitle`). */
const EMPTY_TITLE = "Canary: catalogue empty";

/** How long an empty catalogue stays a non-paging warning after it first paged. */
const EMPTY_REPAGE_MS = 7 * 24 * 60 * 60 * 1_000;

/**
 * Has the empty catalogue already been raised recently? An empty catalogue is
 * a STATE, not an event: once the examples are retired and before real supply
 * arrives it can last weeks, and paging on every run would teach the founder to
 * mute the pager. So `empty` pages on the transition (no such alert in the last
 * week) and is a visible, non-paging warning after that. A failed read counts
 * as "not raised", so the first sighting always pages.
 */
async function emptyAlreadyRaised(admin: AdminClient): Promise<boolean> {
  try {
    const { count, error } = await (admin as unknown as Reader)
      .from("risk_alerts")
      .select("id", { count: "exact", head: true })
      .eq("title", EMPTY_TITLE)
      .gte("created_at", new Date(Date.now() - EMPTY_REPAGE_MS).toISOString());
    return !error && (count ?? 0) > 0;
  } catch {
    return false;
  }
}

/** The cron job: the probe, turned into the verdict `runCronJob` records and alerts on. */
export async function catalogueCanary(admin: AdminClient, reader?: Reader): Promise<JobVerdict> {
  const probe = await probeCatalogue(admin, reader);
  const counts = { control: probe.control ?? -1, visible: probe.visible ?? -1 };
  const detail = { reason: probe.reason, code: probe.code, card_read: probe.cardRead, ...counts };
  if (probe.ok) return { outcome: "ok", counts, detail, alert: null };
  if (probe.reason === "empty") {
    const raised = await emptyAlreadyRaised(admin);
    return {
      outcome: "attention",
      counts,
      detail,
      alert: { kind: "canary.catalogue_empty", severity: raised ? "warning" : "critical", detail },
    };
  }
  return {
    outcome: "attention",
    counts,
    detail,
    alert: { kind: "canary.catalogue", severity: "critical", detail },
  };
}
