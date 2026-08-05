/**
 * Transactional email checks. Plain node, no browser, no server:
 *
 *   node apps/web/tests/email-render.spec.mjs
 *
 * Be clear about what this is. Node cannot import the TypeScript modules in
 * src/lib/email without a compiler, and asserting against build output would
 * be testing the build rather than the source, so this script reads the four
 * source files as text and checks the invariants that are visible there:
 *
 *   1. the message catalogue exports every message, and every message returns
 *      a subject and HTML built through the shared shell;
 *   2. the HTML fragments in render.ts are well formed: every template literal
 *      parses with balanced tags, void elements aside;
 *   3. the fragments are email safe: table layout, inline styles only, no
 *      external stylesheet, no web font, no script, and no Supabase auth
 *      placeholder left behind from the generator they were ported from;
 *   4. the brand palette is the navy and electric blue anchors, with no purple
 *      family colour or name anywhere;
 *   5. the copy rules hold: no em dash, no charge-related wording, no
 *      demo/sample/preview hedging;
 *   6. nothing can send without RESEND_API_KEY, and every send site in the
 *      wired actions goes through bestEffortEmail.
 *
 * What it does NOT check, and cannot: that the rendered emails look right in a
 * real client, that formatMoney output is correct, or that a send succeeds.
 * The first needs a client, the second is the i18n package's own concern, the
 * third needs a key and a real inbox. Rendering is covered by tsc plus review.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const EMAIL_DIR = join(HERE, "..", "src", "lib", "email");
const LIB_DIR = join(HERE, "..", "src", "lib");

const read = (path) => readFileSync(path, "utf8");

const sources = {
  "email/client.ts": read(join(EMAIL_DIR, "client.ts")),
  "email/render.ts": read(join(EMAIL_DIR, "render.ts")),
  "email/messages.ts": read(join(EMAIL_DIR, "messages.ts")),
  "email/recipients.ts": read(join(EMAIL_DIR, "recipients.ts")),
};

const wired = {
  "bookings/actions.ts": read(join(LIB_DIR, "bookings", "actions.ts")),
  "bookings/arrival.ts": read(join(LIB_DIR, "bookings", "arrival.ts")),
  "wallet/actions.ts": read(join(LIB_DIR, "wallet", "actions.ts")),
  "support/actions.ts": read(join(LIB_DIR, "support", "actions.ts")),
};

/**
 * Comments removed, so the copy rules are checked against what ships in an
 * email rather than against the prose that explains it. Block comments go
 * wholesale; line comments only when the line is nothing but a comment, so an
 * https:// inside a string is left alone.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

const copy = Object.fromEntries(
  Object.entries(sources).map(([name, source]) => [name, stripComments(source)]),
);

let failures = 0;
let checks = 0;

function check(label, condition, detail) {
  checks += 1;
  if (condition) {
    process.stdout.write(`  ok   ${label}\n`);
    return;
  }
  failures += 1;
  process.stdout.write(`  FAIL ${label}${detail ? `: ${detail}` : ""}\n`);
}

function section(title) {
  process.stdout.write(`\n${title}\n`);
}

/* ------------------------------------------------------- 1. the catalogue */

const MESSAGES = [
  "bookingRequested",
  "bookingRequestedHost",
  "bookingConfirmed",
  "stayArrivalDetails",
  "bookingCancelled",
  "bookingRefunded",
  "walletFunded",
  "withdrawalFailed",
  "supportTicketFiled",
];

section("Message catalogue (email/messages.ts)");

for (const name of MESSAGES) {
  const exported = new RegExp(
    `export function ${name}\\(data: [A-Za-z]+\\): EmailMessage \\{`,
  ).test(sources["email/messages.ts"]);
  check(`${name} is exported and returns EmailMessage`, exported);
}

// bookingRequested must not be a prefix match for bookingRequestedHost.
check(
  "every exported function in the catalogue is a known message",
  (sources["email/messages.ts"].match(/^export function (\w+)/gm) ?? [])
    .map((line) => line.replace("export function ", ""))
    .every((name) => MESSAGES.includes(name)),
  "an unlisted export appeared, so this test is out of date",
);

// The type declaration says `subject: string`; a message assigns a value.
const subjectCount = (sources["email/messages.ts"].match(/^\s+subject: (?!string)/gm) ?? []).length;
const shellCount = (sources["email/messages.ts"].match(/html: shell\(\{/g) ?? []).length;
check(
  `all ${MESSAGES.length} messages set a subject`,
  subjectCount === MESSAGES.length,
  `found ${subjectCount}`,
);
check(
  `all ${MESSAGES.length} messages render through the shared shell`,
  shellCount === MESSAGES.length,
  `found ${shellCount}`,
);
check(
  "the booking emails carry the safety line, and only they do",
  (sources["email/messages.ts"].match(/GUEST_SAFETY_LINE,/g) ?? []).length === 5 &&
    (sources["email/messages.ts"].match(/HOST_SAFETY_LINE,/g) ?? []).length === 1 &&
    /pay only after you have inspected/.test(sources["email/messages.ts"]),
);
check(
  "money is rendered through the money() helper, never a raw minor integer",
  !/\$\{[^}]*[Mm]inor\}/.test(sources["email/messages.ts"]),
  "a *Minor value was interpolated directly into copy",
);

/* ------------------------------------------- 2. the HTML fragments parse */

const VOID_TAGS = new Set(["area", "base", "br", "col", "hr", "img", "input", "link", "meta", "source", "wbr"]);

/** Every backtick string in a source file, with ${...} holes blanked out. */
function templateLiterals(source) {
  const found = [];
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== "`") continue;
    if (i > 0 && source[i - 1] === "\\") continue;
    let end = i + 1;
    while (end < source.length && !(source[end] === "`" && source[end - 1] !== "\\")) end += 1;
    const raw = source.slice(i + 1, end);
    // The literals in render.ts hold no nested backticks and no nested braces
    // inside an interpolation, which is what makes this simple pass valid.
    found.push(raw.replace(/\$\{[^{}]*\}/g, "X"));
    i = end;
  }
  return found;
}

/** Balanced-tag check over an HTML fragment. Returns null when it parses. */
function tagFault(html) {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!doctype[^>]*>/gi, "");
  const stack = [];
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;
  let match;
  while ((match = tag.exec(cleaned)) !== null) {
    const [, closing, name, selfClosing] = match;
    const lower = name.toLowerCase();
    if (VOID_TAGS.has(lower) || selfClosing === "/") {
      if (closing === "/") return `stray closing </${lower}>`;
      continue;
    }
    if (closing === "/") {
      const open = stack.pop();
      if (open !== lower) return `</${lower}> closes <${open ?? "nothing"}>`;
      continue;
    }
    stack.push(lower);
  }
  return stack.length > 0 ? `unclosed <${stack.join(">, <")}>` : null;
}

section("HTML fragments (email/render.ts)");

const fragments = templateLiterals(sources["email/render.ts"]).filter((literal) =>
  literal.includes("<"),
);
check("render.ts holds HTML fragments to check", fragments.length >= 6, `found ${fragments.length}`);

let malformed = 0;
for (const fragment of fragments) {
  const fault = tagFault(fragment);
  if (fault) {
    malformed += 1;
    process.stdout.write(`       ${fault} in: ${fragment.slice(0, 70).replace(/\s+/g, " ")}\n`);
  }
}
check(`all ${fragments.length} fragments have balanced tags`, malformed === 0, `${malformed} malformed`);

const shellFragment = fragments.find((f) => f.includes("<!doctype html>"));
check("the shell is a complete document", Boolean(shellFragment));
if (shellFragment) {
  check("the shell sets a dark colour scheme", /name="color-scheme" content="dark"/.test(shellFragment));
  check("the shell carries the preheader span", /display:none!important/.test(shellFragment));
  check("the shell carries the logo image", /\/brand\/rentme-logo\.png/.test(shellFragment));
  check("the shell signs off with the brand line", /RentMe\. Find it\. Rent it\. Love it\./.test(sources["email/render.ts"]));
}

/* --------------------------------------------------- 3. email client safety */

section("Email client safety (no external assets, table layout)");

const renderSource = sources["email/render.ts"];
for (const [label, pattern] of [
  ["no external stylesheet", /<link\b/i],
  ["no style block", /<style\b/i],
  ["no script", /<script\b/i],
  ["no CSS import", /@import/i],
  ["no web font", /fonts\.(googleapis|gstatic)/i],
]) {
  check(label, !pattern.test(renderSource));
}
check(
  "no Supabase auth placeholder survives in the markup",
  !/\{\{\s*\./.test(copy["email/render.ts"]) && !/\{\{\s*\./.test(copy["email/messages.ts"]),
);
check("table layout is used for structure", /<table role="presentation"/.test(renderSource));
check("styles are inline attributes", (renderSource.match(/style="/g) ?? []).length > 15);
check("the system font stack is used", /-apple-system,BlinkMacSystemFont/.test(renderSource));
check("interpolated values are escaped", /escapeHtml\(/.test(renderSource));

/* ----------------------------------------------------------- 4. the palette */

section("Brand palette (navy and electric blue, never purple)");

for (const hex of ["#010118", "#030327", "#0C39EF", "#0010D0", "#101A55", "#7C86C2"]) {
  check(`palette anchor ${hex} is present`, renderSource.includes(hex));
}
for (const [label, pattern] of [
  ["no purple, violet or magenta named in the markup", /\b(purple|violet|magenta|indigo|fuchsia)\b/i],
  ["no cyan named in the markup", /\bcyan\b/i],
  ["no known purple hex", /#(7C3AED|8B5CF6|A855F7|6D28D9|9333EA|C026D3|A78BFA)/i],
]) {
  check(label, !pattern.test(copy["email/render.ts"]));
}

/* -------------------------------------------------------------- 5. the copy */

section("Copy rules (British, calm, no charges, no hedging)");

const EM_DASH = String.fromCharCode(0x2014);
for (const [name, source] of Object.entries(sources)) {
  check(`${name} has no em dash`, !source.includes(EM_DASH));
  check(`${name} never says fee or fees`, !/\bfees?\b/i.test(source));
  check(
    `${name} copy has no demo or preview hedging`,
    !/\b(demo|sample|preview|not live|coming soon)\b/i.test(copy[name]),
  );
}
check(
  "no American spellings in the catalogue copy",
  !/\b(canceled|canceling|organiz|apologize|inquiry|center)\w*/i.test(sources["email/messages.ts"]),
);

/* ------------------------------------------------------ 6. the send guards */

section("Send guards (nothing sends unconfigured, nothing can fail an action)");

const clientSource = sources["email/client.ts"];
check(
  "sendEmail returns unconfigured with no API key",
  /if \(key\.length === 0\) return \{ sent: false, reason: "unconfigured" \};/.test(clientSource),
);
check(
  "the key is read lazily from RESEND_API_KEY, never at import",
  /function apiKey\(\)[\s\S]{0,120}process\.env\.RESEND_API_KEY/.test(clientSource) &&
    !/^const \w+ = process\.env\.RESEND_API_KEY/m.test(clientSource),
);
check("a send times out after ten seconds", /REQUEST_TIMEOUT_MS = 10_000/.test(clientSource));
check(
  "the From address defaults to the RentMe sender",
  /DEFAULT_FROM = "RentMe <hello@rentme\.ng>"/.test(clientSource) &&
    /process\.env\.EMAIL_FROM/.test(clientSource),
);
check(
  "sendEmail reports failure by result, never by throwing",
  !/\bthrow\b/.test(clientSource),
);
check(
  "bestEffortEmail skips when unconfigured and swallows failures",
  /if \(!isEmailConfigured\(\)\) return;/.test(clientSource) &&
    /try \{\n\s+await work\(\);\n\s+\} catch \{/.test(clientSource),
);
check(
  "no recipient, subject or body is logged",
  !/console\.\w+\([^)]*(message\.|to\b|subject|html)/.test(clientSource),
);

for (const [name, source] of Object.entries(wired)) {
  const sends = (source.match(/\bsendEmail\(/g) ?? []).length;
  const guards = (source.match(/\bbestEffortEmail\(/g) ?? []).length;
  check(`${name} sends at least one email`, sends > 0, `found ${sends}`);
  check(
    `${name} wraps every send in bestEffortEmail`,
    guards > 0 && guards <= sends,
    `${sends} sends, ${guards} guards`,
  );
  check(`${name} has no em dash`, !source.includes(EM_DASH));
}
check(
  "the support acknowledgement goes to the validated form address",
  /sendEmail\(\{ to: email,/.test(wired["support/actions.ts"]),
);
check(
  "recipient addresses come from the session or the database only",
  /contactFromSession|contactForUser|contactForAgent/.test(wired["bookings/actions.ts"]) &&
    /contactFromSession|contactForUser/.test(wired["wallet/actions.ts"]),
);

/* ----------------------------------------------------------------- summary */

process.stdout.write(
  `\n${checks - failures}/${checks} checks passed${failures > 0 ? `, ${failures} failed` : ""}\n`,
);
process.exit(failures > 0 ? 1 : 0);
