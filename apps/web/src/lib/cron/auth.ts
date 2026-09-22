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

/**
 * Constant-time bearer comparison. False on any shape we do not recognise.
 *
 * BOTH SIDES ARE TRIMMED, AND THAT IS THE WHOLE REASON THIS COMMENT EXISTS.
 *
 * A secret reaches this deployment by somebody pasting it into a dashboard
 * field, and a paste brings a trailing newline more often than not. Neither
 * side was trimmed, so a newline on EITHER value made the two lengths differ,
 * the length guard returned false before the comparison was even reached, and
 * every scheduled job was answered 401 by its own platform. Nothing in the
 * refusal could say why: a wrong secret and a right secret with a newline on
 * the end are the same event from in here.
 *
 * The same fault, in the same shape, took the database side down on 22
 * September: `btrim(x)` with one argument strips SPACES ONLY, so a pasted
 * newline survived it and built an invalid URL. Fixing that in SQL and not
 * here would have left half the door open.
 *
 * Trimming costs nothing. Whitespace at either end of a bearer token is never
 * meaningful, no secret is weakened by ignoring it, and the comparison below
 * is still constant time over the values that remain. A person pasting a
 * secret into a form is not making a mistake.
 */
export function bearerMatches(header: string | null | undefined, expected: string): boolean {
  const want = expected.trim();
  if (want.length === 0) return false;
  const value = header ?? "";
  const presented = value.startsWith("Bearer ") ? value.slice(7).trim() : "";
  if (presented.length === 0) return false;

  const a = Buffer.from(want, "utf8");
  const b = Buffer.from(presented, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * WHICH KIND OF "NOT AUTHORISED" THIS WAS.
 *
 * THE REASON THIS EXISTS, and it cost four days. A 401 from this door was one
 * undifferentiated event, and at least three entirely different faults arrive
 * wearing it:
 *
 *   NO BEARER AT ALL     the scheduler sent no Authorization header, which
 *                        means Vercel is not injecting one, which means the
 *                        variable it reads is absent or misnamed. This was
 *                        the real fault on 22 September: the project held
 *                        `CRONS_SECRET` and Vercel reads `CRON_SECRET`, so
 *                        every request arrived bare.
 *   NO SECRET HERE       the deployment has no RECONCILE_CRON_SECRET, so the
 *                        door refuses everything, including a correct caller.
 *   A DIFFERENT SECRET   both sides have one and they disagree, which is the
 *                        rotation-gone-wrong everybody assumes first and
 *                        which was NOT what happened.
 *
 * From inside the door all three said "not authorised", so the alert could
 * not name any of them, and three separate wrong diagnoses were offered
 * before somebody read the variable list. The information was always there;
 * nothing was carrying it.
 *
 * IT IS FOR OUR OWN DESK AND NEVER FOR THE CALLER. The HTTP response stays a
 * bare 401: telling a stranger WHY their bearer failed is a free oracle.
 */
export type CronAuthVerdict = "ok" | "no-bearer" | "no-secret-configured" | "secret-mismatch";

export function cronAuthVerdict(request: Request): CronAuthVerdict {
  const expected = (process.env.RECONCILE_CRON_SECRET ?? "").trim();
  if (expected.length === 0) return "no-secret-configured";

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (presented.length === 0) return "no-bearer";

  return bearerMatches(header, expected) ? "ok" : "secret-mismatch";
}

export function authorisedCron(request: Request): boolean {
  return cronAuthVerdict(request) === "ok";
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
