import { timingSafeEqual } from "node:crypto";

/**
 * The one guard on every scheduled job.
 *
 * Exactly the check app/api/paystack/reconcile/route.ts makes, lifted so the
 * four lifecycle jobs cannot each drift into their own version: a bearer
 * token compared in constant time against RECONCILE_CRON_SECRET. When the
 * secret is not set every job refuses everything, because an open endpoint
 * that cancels bookings is worse than a job that does not run, and a job
 * that does not run says so in its own log on every attempt.
 *
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; the deploy must
 * hold the same value under both names (docs/DEPLOY.md, section 2).
 */

/** Constant-time bearer comparison. False on any shape we do not recognise. */
export function bearerMatches(header: string | null | undefined, expected: string): boolean {
  if (expected.length === 0) return false;
  const value = header ?? "";
  const presented = value.startsWith("Bearer ") ? value.slice(7) : "";
  if (presented.length === 0) return false;

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(presented, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function authorisedCron(request: Request): boolean {
  return bearerMatches(
    request.headers.get("authorization"),
    process.env.RECONCILE_CRON_SECRET ?? "",
  );
}

/**
 * WHO WAS REFUSED, AND WHY THE ANSWER CHANGES WHAT THE REFUSAL MEANS.
 *
 * A bad bearer from an address nobody knows is somebody trying a door. A bad
 * bearer from OUR OWN SCHEDULER is a job that did not run, and the two were
 * being reported at the same level and in the same words until the sweep of
 * 22 September measured what that cost: on this project, on the morning it
 * was measured, `public.risk_alerts` held 256 open rows reading
 * "Cron: ... unauthorised" at MEDIUM severity, one per scheduled run since 19
 * September, across all seven jobs. The hold sweep alone had 87. Every one of
 * them meant the job had not run, none of them said so, and not one of them
 * was severe enough to make anybody open the desk. Four days of every
 * scheduled job on the platform being dead, reported hourly, in a colour that
 * reads as somebody probing a URL.
 *
 * Vercel Cron identifies itself in the user agent as `vercel-cron/1.0`. A
 * header is not proof and this is deliberately not used as one: it never
 * grants anything, and the request is refused either way. It only chooses how
 * loudly the refusal is said. The worst a forged agent buys is a critical row
 * on the desk instead of a warning one, which is a false alarm and not a way
 * in, and the alert writer folds repeats of the same title inside ten minutes
 * into one row.
 */
export function fromPlatformScheduler(request: Request): boolean {
  return (request.headers.get("user-agent") ?? "").toLowerCase().includes("vercel-cron");
}
