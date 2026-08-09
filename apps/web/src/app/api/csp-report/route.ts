import { NextResponse } from "next/server";

/**
 * Where browsers post Content Security Policy violations.
 *
 * The policy ships in report-only mode, which means this endpoint IS the
 * deliverable for now: it is the only way to learn which directive is wrong
 * before turning enforcement on and finding out from a guest whose checkout
 * went blank. Every report is written to the deployment log as one
 * `[csp]` line, which is where the person about to flip `CSP_ENFORCE` reads
 * them.
 *
 * ## This is an unauthenticated POST endpoint, so it is deliberately tiny
 *
 * It has to be open, because a violation is reported by the browser of somebody
 * who may not be signed in, and often on the very page that failed. That makes
 * it a free write surface for anybody who finds it, and the mitigations are
 * shape rather than authentication:
 *
 * - **It stores nothing.** No table, no row, no growth. A flood costs log
 *   lines, not database.
 * - **The body is capped** and anything larger is dropped unread, so this
 *   cannot be used to push megabytes into the log with one request.
 * - **Only four fields are logged**, each truncated. The rest of a report is
 *   ignored, so an attacker cannot choose what appears in our logs beyond a
 *   bounded, known shape.
 * - **Identical reports are throttled**, because one broken directive on a
 *   popular page produces thousands of copies a minute and would bury the other
 *   directives that are also broken.
 *
 * It answers 204 to everything, including malformed input. A reporting endpoint
 * that argues with the browser gets retried; one that says "received" is left
 * alone, and there is no legitimate caller to help by returning an error.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports above this are dropped unread. A real one is a few hundred bytes. */
const MAX_BODY_BYTES = 16_384;

/** Longest any single logged field may be. */
const MAX_FIELD = 200;

/** How long the same directive and blocked source stays quiet. */
const QUIET_MS = 60_000;

/**
 * The most distinct violations kept in the quiet map at once.
 *
 * The map is keyed on the directive AND the blocked URL, and the blocked URL is
 * chosen by whoever posts the report. Without a ceiling, a caller sending a
 * unique blocked URL each time grows this map for as long as the instance
 * lives, which turns the one mitigation this endpoint does not have (there is
 * no authentication, by necessity) into a slow memory exhaustion.
 *
 * 500 is far above any real deployment. A page breaking every directive in a
 * strict policy produces on the order of a dozen distinct pairs, not hundreds,
 * so a map that has grown past this is by definition not being fed by browsers
 * reporting genuine violations.
 */
const MAX_QUIET_KEYS = 500;

const lastLogged = new Map<string, number>();

/**
 * Keep the quiet map bounded.
 *
 * Expired entries first, because those are free and are the common case: a
 * quiet window that has rolled over carries no information. Only if the map is
 * still oversized does it drop live entries, oldest insertion first, and the
 * cost of that is a single duplicate log line for a violation that had already
 * been seen. `Map` iterates in insertion order, which is what makes the second
 * pass an eviction policy rather than an arbitrary cull.
 *
 * This mirrors `pruneDenyCache` in `lib/security/rate-limit.ts` deliberately.
 * That module solved the same problem for the same reason and reasoned it out
 * in a comment; two answers to one question is how they drift apart.
 */
function pruneQuietMap(now: number): void {
  for (const [key, at] of lastLogged) {
    if (now - at >= QUIET_MS) lastLogged.delete(key);
  }
  if (lastLogged.size <= MAX_QUIET_KEYS) return;
  let overflow = lastLogged.size - MAX_QUIET_KEYS;
  for (const key of lastLogged.keys()) {
    lastLogged.delete(key);
    overflow -= 1;
    if (overflow <= 0) break;
  }
}

function field(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_FIELD) : "";
}

/**
 * One report, in either of the two shapes browsers send.
 *
 * The deprecated `report-uri` produces `{"csp-report": {...}}` with hyphenated
 * keys; the newer Reporting API produces an ARRAY of `{type, body}` with camel
 * case. Both are sent by the policy on purpose, because no single one is
 * universally supported, so both are read here rather than assuming whichever
 * the current browser happens to use.
 */
type Violation = { directive: string; blocked: string; document: string; disposition: string };

function readViolation(entry: unknown): Violation | null {
  if (typeof entry !== "object" || entry === null) return null;
  const record = entry as Record<string, unknown>;

  const legacy = record["csp-report"];
  const modern = record["body"];
  const source = (
    typeof legacy === "object" && legacy !== null
      ? legacy
      : typeof modern === "object" && modern !== null
        ? modern
        : record
  ) as Record<string, unknown>;

  const directive =
    field(source["effectiveDirective"]) ||
    field(source["effective-directive"]) ||
    field(source["violatedDirective"]) ||
    field(source["violated-directive"]);
  if (directive.length === 0) return null;

  return {
    directive,
    blocked: field(source["blockedURL"]) || field(source["blocked-uri"]) || "unknown",
    document: field(source["documentURL"]) || field(source["document-uri"]),
    disposition: field(source["disposition"]) || "report",
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const acknowledged = new NextResponse(null, { status: 204 });

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return acknowledged;

  let payload: unknown;
  try {
    const raw = await request.text();
    // Checked again after reading, because content-length can lie or be absent
    // under chunked encoding.
    if (raw.length > MAX_BODY_BYTES) return acknowledged;
    payload = JSON.parse(raw);
  } catch {
    return acknowledged;
  }

  const entries = Array.isArray(payload) ? payload : [payload];
  for (const entry of entries.slice(0, 20)) {
    const violation = readViolation(entry);
    if (!violation) continue;

    const key = `${violation.directive}|${violation.blocked}`;
    const now = Date.now();
    const previous = lastLogged.get(key);
    if (previous !== undefined && now - previous < QUIET_MS) continue;
    if (lastLogged.size >= MAX_QUIET_KEYS) pruneQuietMap(now);
    lastLogged.set(key, now);

    console.warn(
      `[csp] ${violation.disposition} ${violation.directive} blocked ${violation.blocked}` +
        (violation.document ? ` on ${violation.document}` : ""),
    );
  }

  return acknowledged;
}
