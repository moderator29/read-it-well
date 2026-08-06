/**
 * The Content Security Policy, checked against a running browser.
 *
 * A CSP is the one security control that is trivial to write and easy to get
 * wrong in a way no static reading catches, because the failure mode is not a
 * missing header. It is a header that is present, looks strict, and silently
 * forbids the application's own hydration payload, leaving a page that renders
 * server markup and then never becomes interactive. That failure looks fine in
 * a screenshot. It only shows up as a `securitypolicyviolation` event and a
 * console refusal, which is what this script collects.
 *
 * It asserts, on public routes at phone size:
 *   1. The policy is served at all, on the HTML response.
 *   2. `script-src` carries a nonce and does NOT carry 'unsafe-inline'. A
 *      policy with both is a policy with neither, since a browser that sees a
 *      nonce ignores 'unsafe-inline' but an attacker only needs one of them.
 *   3. The four directives that cost nothing and close real attacks are set:
 *      object-src, base-uri, form-action, frame-ancestors.
 *   4. The nonce is freshly minted per request, not a build-time constant. A
 *      fixed nonce is decoration: an injected script can simply carry it.
 *   5. The hand-written theme script in `app/layout.tsx` carries the nonce.
 *   6. Nothing is actually blocked. Zero violations, zero console refusals.
 *   7. The page hydrates, proving the nonce reached Next's own inline scripts.
 *
 * Self-contained: no runner, no config. Run with a server already listening:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/csp.spec.mjs
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE = "/opt/pw-browsers/chromium";
const WAIT = 1500;

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures.push(label + (detail ? ` (${detail})` : ""));
    console.log(`  FAIL  ${label}${detail ? ` (${detail})` : ""}`);
  }
}

/** Pull one directive's source list out of a policy string. */
function directive(policy, name) {
  const found = policy
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  return found ?? null;
}

/**
 * Collect violations from inside the page.
 *
 * Playwright's init scripts run in an isolated world that the page's own policy
 * does not govern, so this listener is never itself blocked by the thing it is
 * measuring.
 */
const COLLECTOR = `
  window.__cspViolations = [];
  document.addEventListener("securitypolicyviolation", (event) => {
    window.__cspViolations.push(
      event.violatedDirective + " blocked " + (event.blockedURI || "inline"),
    );
  });
`;

async function auditRoute(page, refusals, route) {
  console.log(route);
  refusals.length = 0;
  await page.evaluate(() => {
    window.__cspViolations = [];
  }).catch(() => {});

  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  check(`${route} responds without a server error`, (response?.status() ?? 500) < 500);

  const policy = response?.headers()["content-security-policy"] ?? "";
  check(`${route} serves a Content Security Policy`, policy.length > 0);
  if (policy.length === 0) return null;

  const script = directive(policy, "script-src") ?? "";
  check(`${route} script-src carries a nonce`, /'nonce-[A-Za-z0-9+/=]+'/.test(script), script);
  check(`${route} script-src has no 'unsafe-inline'`, !script.includes("'unsafe-inline'"));
  check(`${route} script-src has no 'unsafe-eval'`, !script.includes("'unsafe-eval'"));

  for (const [name, expected] of [
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["frame-ancestors", "'none'"],
  ]) {
    const value = directive(policy, name);
    check(`${route} sets ${name} ${expected}`, value === `${name} ${expected}`, value ?? "absent");
  }

  /* form-action is not an exact match: it names the two redirect destinations
     the no-JS path needs, Supabase authorize and Paystack checkout. What must
     hold is that it exists, starts from 'self', and has not been widened to a
     wildcard. See the long note in lib/security/csp.ts. */
  const formAction = directive(policy, "form-action") ?? "";
  check(`${route} sets form-action from 'self'`, formAction.startsWith("form-action 'self'"), formAction);
  check(`${route} form-action is not a wildcard`, !/[\s]\*|https:(\s|$)/.test(formAction), formAction);

  /*
   * The hand-written theme script has to be stamped by hand. If this is missing
   * the light theme flashes dark on every load for the people who chose it.
   *
   * READ THE PROPERTY, NOT THE ATTRIBUTE. Chromium hides a nonce from
   * `getAttribute("nonce")` and returns an empty string, deliberately: without
   * that, an injected stylesheet could read the nonce back out through an
   * attribute selector and an attacker would have the key to the whole policy.
   * The `nonce` IDL property still carries the real value. An earlier version
   * of this spec read the attribute and reported a correctly nonced script as
   * unstamped, which is a spec fault dressed up as a product fault.
   */
  const inlineNonce = await page.evaluate(() => {
    const tag = [...document.querySelectorAll("script:not([src])")].find((s) =>
      s.textContent.includes("nf_theme"),
    );
    return tag ? tag.nonce || tag.getAttribute("nonce") || "" : "no-such-script";
  });
  check(
    `${route} stamps the theme script with a nonce`,
    typeof inlineNonce === "string" && inlineNonce.length > 0 && inlineNonce !== "no-such-script",
    String(inlineNonce),
  );

  const violations = await page.evaluate(() => window.__cspViolations ?? []);
  check(`${route} triggers no policy violations`, violations.length === 0, violations.join(", "));
  check(`${route} logs no console refusals`, refusals.length === 0, refusals.join(" | "));

  // Hydration is the proof that the nonce reached Next's own inline scripts.
  // Server markup renders identically whether or not they were allowed to run.
  const hydrated = await page.evaluate(
    () => document.documentElement.dataset.hydrated === "1" || !!window.next || !!window.__next_f,
  );
  check(`${route} hydrates`, hydrated === true);

  return directive(policy, "script-src");
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
await context.addInitScript(COLLECTOR);
const page = await context.newPage();

/* A blocked resource is reported to the console as "Refused to ...". Collecting
   these alongside the violation events catches the cases Chromium reports one
   way and not the other. */
const refusals = [];
page.on("console", (message) => {
  const text = message.text();
  if (/Content Security Policy|Refused to/i.test(text)) refusals.push(text);
});

try {
  const landing = await auditRoute(page, refusals, "/");
  const signIn = await auditRoute(page, refusals, "/sign-in");

  console.log("nonce freshness");
  check(
    "the nonce is minted per request, not fixed at build time",
    landing !== null && signIn !== null && landing !== signIn,
    landing === signIn ? "both requests served the same script-src" : "",
  );
} finally {
  await browser.close();
}

console.log("");
if (failures.length > 0) {
  console.log(`${failures.length} check(s) failed:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("all CSP checks passed");
