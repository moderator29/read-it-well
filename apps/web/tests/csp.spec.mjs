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

  /*
   * EVERY inline script, not just the one we knew about.
   *
   * An earlier version of this spec checked only the theme script by name, and
   * a merge then landed a second hand-written inline script for save-data
   * detection with no nonce on it. The violation check below caught it, which
   * is the point of having one, but a named check would have gone on passing
   * while a new script was blocked on every route. Counting them is the
   * invariant that survives somebody adding a third.
   */
  const unnonced = await page.evaluate(() =>
    [...document.querySelectorAll("script:not([src])")]
      .filter((tag) => tag.textContent.trim().length > 0)
      .filter((tag) => !(tag.nonce || tag.getAttribute("nonce")))
      .map((tag) => tag.textContent.trim().slice(0, 60)),
  );
  check(
    `${route} nonces every inline script it writes`,
    unnonced.length === 0,
    unnonced.join(" | "),
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

/**
 * The rest of the product, checked for one thing only: that nothing is blocked.
 *
 * The full audit above is about the shape of the policy, and the shape is the
 * same on every route because one function builds it. What differs per route is
 * what the page actually tries to LOAD, and that is where a policy breaks
 * something: a script-src that forbids a chunk, an img-src missing a tile host,
 * a connect-src missing an endpoint. None of that shows up on a landing page.
 *
 * `/search` is the one that matters most. It dynamically imports Leaflet, which
 * is exactly the case `strict-dynamic` exists to permit and exactly the case a
 * badly written policy breaks: the nonced bootstrap injects the chunk, and if
 * the browser does not trust it the map never draws. It also fetches raster
 * tiles from a third party, which is the only cross-origin image load on the
 * platform, and it is the only surface that asks for geolocation.
 *
 * This sandbox has no Supabase keys, so the middleware is a pass through and
 * these product routes render their signed-out or unconfigured states rather
 * than redirecting. That is what makes them reachable to walk here at all.
 */
const WALK = ["/search", "/wallet", "/assistant", "/styleguide", "/docs", "/privacy"];

async function walkRoute(page, refusals, route) {
  refusals.length = 0;
  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "load" });
  /* Longer than the audit's wait: the map has to import its chunk, construct
     itself and ask for tiles before there is anything to be blocked. */
  await page.waitForTimeout(2500);

  const policy = response?.headers()["content-security-policy"] ?? "";
  check(`${route} carries the policy`, policy.length > 0);

  const violations = await page.evaluate(() => window.__cspViolations ?? []);
  check(`${route} blocks nothing`, violations.length === 0, violations.join(", "));
  check(`${route} logs no refusals`, refusals.length === 0, refusals.join(" | "));
}

try {
  const landing = await auditRoute(page, refusals, "/");
  const signIn = await auditRoute(page, refusals, "/sign-in");

  console.log("nonce freshness");
  check(
    "the nonce is minted per request, not fixed at build time",
    landing !== null && signIn !== null && landing !== signIn,
    landing === signIn ? "both requests served the same script-src" : "",
  );

  console.log("nothing blocked across the product");
  for (const route of WALK) {
    await walkRoute(page, refusals, route);
  }

  /*
   * The map, asserted rather than assumed.
   *
   * "/search blocks nothing" above is worth very little on its own, because a
   * page where the map never opened also blocks nothing. The two things this
   * policy could plausibly break are both here and neither is visible from a
   * violation count: `strict-dynamic` has to let the nonced bootstrap import
   * the Leaflet chunk, and `img-src` has to name the tile host. If either is
   * wrong the map is a grey box, the page still loads, and every check above
   * still passes.
   *
   * So this opens the map and insists on the evidence: a constructed Leaflet
   * container, and raster tiles actually fetched from the third party.
   */
  console.log("the map, which is what strict-dynamic and img-src are for");
  const tiles = [];
  page.on("request", (request) => {
    if (/cartocdn|maptiler/.test(request.url())) tiles.push(request.url());
  });

  await page.goto(`${BASE_URL}/search`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  const mapOpener = page.locator('button:has-text("Map"), [data-testid*="map"]').first();
  if (await mapOpener.count()) {
    await mapOpener.click().catch(() => {});
    await page.waitForTimeout(3500);
  }

  check(
    "Leaflet's chunk loads and constructs, so strict-dynamic permits the import",
    (await page.locator(".leaflet-container").count()) > 0,
  );
  check("tiles load from the third party, so img-src names the host", tiles.length > 0, `${tiles.length} tile requests`);
  check(
    "and the map triggered no violations",
    (await page.evaluate(() => window.__cspViolations ?? [])).length === 0,
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
