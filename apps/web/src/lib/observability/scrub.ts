/**
 * The scrubber that stands between a crash and a third party.
 *
 * Crash reporting is the most dangerous telemetry this platform will ever
 * send, because the interesting part of a crash is exactly the part that
 * carries the person: the value that failed to parse, the row that came back
 * empty, the header that was rejected. A reporter that forwards "what it
 * found" forwards a NIN, a bank account, a card, an email and a bearer token
 * to a vendor's servers, and rule 16 does not have an observability
 * exception.
 *
 * SO THIS IS AN ALLOWLIST, NOT A DENYLIST, and the difference is the whole
 * design. A denylist is a bet that nobody will ever add a field you did not
 * think of; every new field is unsafe by default until somebody remembers.
 * An allowlist is a bet that somebody will notice a missing field in a
 * report, which is a bet that fails loudly and harmlessly. Only the keys in
 * `ALLOWED_CONTEXT_KEYS` ever reach the wire, and everything else is dropped
 * unread, whatever it is called and whatever it holds.
 *
 * THE ALLOWLIST IS NOT ENOUGH ON ITS OWN, which is the second half. An
 * allowed key still carries a free-text value: a message reading "invalid
 * account 0123456789 for segun@example.com" passes any key test ever
 * written. So every surviving string is then redacted for the shapes that
 * name a person or open a door, and only then truncated.
 *
 * THE THIRD LAYER IS BORROWED, DELIBERATELY. `lib/alerts/record.ts` already
 * owns this platform's vocabulary of credential-shaped key names, worked out
 * for the admin alert desk. A second copy of that list here would drift from
 * it within a month and the drift would be invisible, so `scrubDetail` is
 * called on the allowlisted bag as the last pass rather than reimplemented.
 * If a key is added there it is honoured here for free.
 *
 * Nothing in this file throws. A scrubber that can fail is a scrubber that
 * gets bypassed by a `catch` somewhere upstream on the one payload that
 * mattered.
 */

import { scrubDetail } from "@/lib/alerts/record";

/**
 * The only context keys that ever leave this process.
 *
 * Every one of them is a machine fact about WHERE and HOW something broke,
 * never about WHO it broke for. Note what is deliberately absent and why:
 *
 *   `path` / `url`    Next hands `onRequestError` the live request path, and
 *                     a live path is `/u/segun-okafor?invite=<token>`. The
 *                     ROUTE PATTERN (`routePath`) answers the same debugging
 *                     question and names no person.
 *   `headers`         cookies, authorization, the device. Never read.
 *   `body` / `params` / `searchParams`
 *                     the payload that failed is the payload we may not have.
 *   `userId` / `email` / `ip`
 *                     Sentry groups by fingerprint, not by person. We lose
 *                     nothing debugging a stack trace anonymously.
 */
export const ALLOWED_CONTEXT_KEYS = [
  /** A dotted machine token for the call site, e.g. "server.request". */
  "kind",
  /** The Next route PATTERN, e.g. "/listing/[id]". Never a live path. */
  "routePath",
  /** "app-router" or "pages-router". */
  "routerKind",
  /** "render", "route" or "action". */
  "routeType",
  /** "server", "edge" or "browser". */
  "runtime",
  /** "react-server-components", "server-rendering" and the rest. */
  "renderSource",
  /** GET, POST. A verb, not a payload. */
  "method",
  /** The HTTP status the framework settled on, when it had one. */
  "statusCode",
  /** Next's own error digest: the id that ties this to the server log. */
  "digest",
  /** Why a revalidation ran, on a cache error. */
  "revalidateReason",
  /** React's component stack: component names and module paths only. */
  "componentStack",
] as const;

export type AllowedContextKey = (typeof ALLOWED_CONTEXT_KEYS)[number];

const ALLOWED = new Set<string>(ALLOWED_CONTEXT_KEYS);

/** Longest any single reported string may be once redacted. */
const MAX_STRING = 400;

/** Longest a stack trace may be. Deep enough to find the frame, bounded. */
const MAX_STACK = 4_000;

/**
 * The shapes that name a person or open a door, redacted wherever they
 * appear in a string that the allowlist has already let through.
 *
 * ORDER IS LOAD BEARING. The specific patterns run before the general ones,
 * because the general digit rule would otherwise eat the middle of a card
 * number and leave the ends, and the general long-token rule would swallow a
 * JWT into one unrecognisable blob. Each rule is commented with the thing it
 * is actually there to stop.
 */
const REDACTIONS: { pattern: RegExp; replacement: string }[] = [
  {
    // A JSON Web Token, which is what a Supabase access or refresh token is.
    pattern: /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}/g,
    replacement: "[redacted:jwt]",
  },
  {
    // "Authorization: Bearer x", "apikey=x", "token: x", however spelled.
    // The label is kept so the frame still reads; only the value goes.
    pattern:
      /\b(authorization|bearer|basic|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|secret|password|passwd|signature|otp|pin)\b\s*[:=]?\s*["']?[A-Za-z0-9._~+/=-]{3,}["']?/gi,
    replacement: "$1=[redacted:credential]",
  },
  {
    // An email address, which is the single most likely thing to be in a
    // validation error message on this platform.
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replacement: "[redacted:email]",
  },
  {
    // A Nigerian mobile number in either local or international form.
    pattern: /(?:\+?234|0)(?:[ -]?\d){10}\b/g,
    replacement: "[redacted:phone]",
  },
  {
    // Any run of six or more digits, separators allowed: a card number, a
    // ten-digit NUBAN account, an eleven-digit NIN or BVN, a document
    // number. Six is deliberately low. A real six-digit machine number in a
    // stack frame is a line offset nobody debugs by, and the cost of losing
    // it is nil against the cost of publishing a NIN once.
    pattern: /\b\d(?:[ -]?\d){5,}\b/g,
    replacement: "[redacted:number]",
  },
  {
    // A long opaque run: an anon key, a service role key, a DSN's public
    // key, a session id, a signed URL's token. Forty is above anything this
    // codebase names an identifier and below every credential it holds.
    pattern: /\b[A-Za-z0-9_-]{40,}\b/g,
    replacement: "[redacted:token]",
  },
];

/**
 * Redact one string. Never throws, always returns a string.
 *
 * Used on every value that survives the allowlist AND on the message and
 * stack, which are not key/value data at all and so can never be protected
 * by a key rule.
 */
export function redact(input: string): string {
  let out = input;
  for (const { pattern, replacement } of REDACTIONS) {
    // Each RegExp is global and therefore stateful; `replace` resets
    // lastIndex itself, but the pattern is never shared across a partial
    // iteration, so this stays correct under concurrent requests.
    out = out.replace(pattern, replacement);
  }
  return out;
}

function clamp(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

/** Redact, then bound. Both, always, in that order. */
export function safeString(value: string, max = MAX_STRING): string {
  return clamp(redact(value), max);
}

/**
 * The allowlist pass.
 *
 * Anything whose key is not in `ALLOWED_CONTEXT_KEYS` is dropped without
 * being looked at. What survives is handed to `lib/alerts/record`'s
 * `scrubDetail`, which applies this platform's existing credential-key
 * vocabulary and flattens nesting, and every resulting string is redacted.
 */
export function scrubContext(
  context: Record<string, unknown> | undefined | null,
): Record<string, string | number | boolean | null> {
  const allowed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context ?? {})) {
    if (!ALLOWED.has(key)) continue;
    allowed[key] = value;
  }

  // The shared vocabulary, second. An allowlisted key that the alert desk
  // considers credential shaped is dropped here without this file having to
  // know why.
  const flattened = scrubDetail(allowed);

  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(flattened)) {
    out[key] = typeof value === "string" ? safeString(value) : value;
  }
  return out;
}

export type ScrubbedError = {
  /** The constructor name, e.g. "TypeError". Never carries data. */
  type: string;
  /** The message, redacted and bounded. */
  value: string;
  /** The stack, redacted and bounded, or null when there was none. */
  stack: string | null;
};

/** Pull a reportable shape out of whatever was thrown. Never throws. */
export function scrubError(error: unknown): ScrubbedError {
  if (error instanceof Error) {
    return {
      type: safeString(error.name || "Error", 80),
      value: safeString(error.message || "", MAX_STRING),
      stack: error.stack ? safeString(error.stack, MAX_STACK) : null,
    };
  }
  if (typeof error === "string") {
    return { type: "Error", value: safeString(error, MAX_STRING), stack: null };
  }
  // An object, a number, a rejected promise carrying anything at all. It is
  // stringified defensively and then redacted like everything else, because
  // `JSON.stringify(rejectionValue)` is a common way to publish a whole API
  // response, credentials and all.
  let text: string;
  try {
    text = JSON.stringify(error) ?? String(error);
  } catch {
    text = "[unserialisable]";
  }
  return { type: "Error", value: safeString(text, MAX_STRING), stack: null };
}
