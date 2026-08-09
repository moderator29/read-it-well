/**
 * Reading a user agent string, without pretending it is more than it is.
 *
 * `auth.sessions.user_agent` is whatever `User-Agent` header reached GoTrue on
 * the request that last touched the session, and on this platform that is not
 * always a browser. The token refresh runs in `src/middleware.ts`, server side,
 * so until the middleware started forwarding the visitor's own header every row
 * in the table read `Vercel Edge Functions`. Those rows are real sessions and
 * their timestamps are true; the device column on them is the truth about our
 * server and says nothing about the reader's phone.
 *
 * So this returns a KIND before it returns a name. A screen that draws
 * "Vercel Edge Functions" beside somebody's wallet is worse than one that says
 * the device was not recorded, because the first invites them to decide whether
 * they recognise a thing that was never about them.
 *
 * ## The raw string never reaches the screen
 *
 * `User-Agent` is attacker controlled. Anyone can sign in with a header of
 * their choosing, and the value lands in a table this account's owner is then
 * shown. React escapes it, so this is not an injection risk, and it is still a
 * bad idea: an attacker who can write "Your account is fine, ignore this" into
 * the row labelled "Device" has a free line of copy on a security screen.
 *
 * This maps the string onto a fixed list of names and returns nothing else.
 * A string that matches nothing comes back as `unrecognised` with no name
 * attached, which is the honest answer and also the safe one.
 */

export type DeviceKind =
  /** A browser we can name, on a platform we can name. */
  | "device"
  /** A real session whose agent was our own server, so the device is unknown. */
  | "server"
  /** No agent recorded at all. */
  | "unrecorded"
  /** An agent was recorded and matches nothing on the list. */
  | "unrecognised";

export type DeviceDescription = {
  kind: DeviceKind;
  /** A proper noun from the list below, or null. Never the raw header. */
  browser: string | null;
  /** A proper noun from the list below, or null. Never the raw header. */
  platform: string | null;
};

/**
 * Agents that are this platform talking to itself.
 *
 * Named so a session refreshed by our own middleware is reported as a session
 * with no device rather than as a device called Vercel. `node` and `undici`
 * are here because a self-hosted deployment refreshes through Node's own fetch
 * and would otherwise land in `unrecognised`, which reads to a person as
 * "something strange signed in".
 */
const OUR_OWN_AGENT = /vercel|next\.js|\bnode(?:\.js)?\b|undici|supabase|\bdeno\b/i;

/*
 * Order matters in both lists, and the reason is the same in each: user agent
 * strings lie by inclusion. Every Chromium browser claims Safari, Edge claims
 * Chrome, and Opera claims both. The most specific claim has to be tested
 * first or every reader is told they are on Safari.
 */
const BROWSERS: readonly [RegExp, string][] = [
  [/\bedg(?:e|a|ios)?\//i, "Edge"],
  [/\bopr\/|\bopera\//i, "Opera"],
  [/\bsamsungbrowser\//i, "Samsung Internet"],
  [/\bucbrowser\//i, "UC Browser"],
  /* Firefox on iOS is fxios and carries no `firefox` token at all. */
  [/\bfirefox\/|\bfxios\//i, "Firefox"],
  [/\bchrome\/|\bcrios\//i, "Chrome"],
  [/\bsafari\//i, "Safari"],
];

const PLATFORMS: readonly [RegExp, string][] = [
  /* Before the iOS tests: an Android tablet string can carry `linux`. */
  [/\bandroid\b/i, "Android"],
  [/\biphone\b|\bipad\b|\bipod\b|\bios\b/i, "iOS"],
  [/\bwindows\b/i, "Windows"],
  [/\bmac os x\b|\bmacintosh\b/i, "macOS"],
  [/\bcros\b/i, "ChromeOS"],
  [/\blinux\b/i, "Linux"],
];

/** The longest header this will look at. Beyond it the string is not a UA. */
const MAX_AGENT = 512;

function firstMatch(value: string, table: readonly [RegExp, string][]): string | null {
  for (const [pattern, name] of table) {
    if (pattern.test(value)) return name;
  }
  return null;
}

export function describeDevice(userAgent: string | null | undefined): DeviceDescription {
  const raw = (userAgent ?? "").trim();
  if (raw.length === 0) return { kind: "unrecorded", browser: null, platform: null };

  /* A header longer than this is not a browser identifying itself, it is
     somebody filling a column. Judged on the truncated copy so the regexes
     cannot be walked into a long backtrack either. */
  const agent = raw.slice(0, MAX_AGENT);

  if (OUR_OWN_AGENT.test(agent)) return { kind: "server", browser: null, platform: null };

  const browser = firstMatch(agent, BROWSERS);
  const platform = firstMatch(agent, PLATFORMS);

  /* One of the two is enough to be worth showing. "Chrome" alone still tells
     somebody whether this is the browser they use, and so does "Android"
     alone. Neither means we know nothing, and we say so. */
  if (browser === null && platform === null) {
    return { kind: "unrecognised", browser: null, platform: null };
  }

  return { kind: "device", browser, platform };
}
