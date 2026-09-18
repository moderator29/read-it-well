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
