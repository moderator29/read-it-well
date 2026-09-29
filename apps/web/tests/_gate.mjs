/**
 * SHARED HELPERS FOR SPECS WRITTEN AFTER THE 23 SEPTEMBER SIGN-IN WALL.
 *
 * Since 23 September every product route answers a signed-out visitor with a
 * 307 to `/sign-in?next=<path>&notice=sign-in-required` (`src/proxy.ts`). A
 * spec that used to read a product page signed out therefore has three honest
 * things it can still do, and this module carries all three:
 *
 *   1. ASSERT THE WALL on the real route (`expectSignInWall`). That is the
 *      intended behaviour for a stranger now, so it is checked, not assumed.
 *   2. READ THE SAME COMPONENTS in the preview harness (`openPreview`), which
 *      renders the real components with fixture data under `/preview/...`.
 *      The harness is closed on Vercel and off Vercel unless the server was
 *      started with `VALLO_PREVIEW_HARNESS=1`; when it is closed the section
 *      is reported as SKIP with that reason, never as a pass.
 *   3. READ THE REAL ROUTE SIGNED IN, with a QA account from the environment
 *      (`qaCredentials`, `signInAsQa`). Absent credentials the section is
 *      reported as SKIP naming the variables; present, it runs.
 *
 * SKIP CONVENTION (read by `run.mjs`). A line `  SKIP    <reason>` marks a
 * section that could not run for a named, missing prerequisite. A spec whose
 * every section was skipped exits with `SKIP_EXIT` (77, the automake
 * convention) so the runner reports it as skipped rather than passed.
 */

export const SKIP_EXIT = 77;

export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";

/** Print a skipped section in the form the runner collects. */
export function skip(reason) {
  console.log(`  SKIP    ${reason}`);
}

/** The QA member's credentials, or null when the environment has none. */
export function qaCredentials() {
  const email = process.env.QA_MEMBER_EMAIL;
  const password = process.env.QA_MEMBER_PASSWORD ?? process.env.QA_PASSWORD;
  return email && password ? { email, password } : null;
}

export const QA_MISSING =
  "QA_MEMBER_EMAIL and QA_MEMBER_PASSWORD are not set, so the signed-in route cannot be read";

/**
 * Assert that a signed-out request for `path` is sent to the sign-in door,
 * carrying the way back and the notice. Checked at the request level (no
 * redirect followed): the 307 and its Location are the whole answer.
 */
export async function expectSignInWall(check, path, base = BASE_URL) {
  let res;
  try {
    res = await fetch(`${base}${path}`, { redirect: "manual" });
  } catch (error) {
    check(`${path} answers signed out (${error instanceof Error ? error.message : error})`, false);
    return false;
  }
  const location = res.headers.get("location") ?? "";
  let target = null;
  try {
    target = location ? new URL(location, base) : null;
  } catch {
    target = null;
  }
  const ok =
    res.status === 307 &&
    target !== null &&
    target.pathname === "/sign-in" &&
    target.searchParams.get("next") === path &&
    target.searchParams.get("notice") === "sign-in-required";
  check(
    `signed out, ${path} redirects to /sign-in with next and the notice (${res.status} ${location.replace(base, "") || "no Location"})`,
    ok,
  );
  return ok;
}

/**
 * Assert that a signed-out call to a gated API answers the proxy's own
 * refusal: 401 with `{ code: "sign-in-required" }`, never data.
 */
export async function expectApiWall(check, path, init = {}, base = BASE_URL) {
  let status = 0;
  let body = null;
  try {
    const res = await fetch(`${base}${path}`, { redirect: "manual", ...init });
    status = res.status;
    body = await res.json().catch(() => null);
  } catch (error) {
    check(`${path} answers signed out (${error instanceof Error ? error.message : error})`, false);
    return false;
  }
  const ok = status === 401 && body?.code === "sign-in-required";
  check(`signed out, ${path} answers 401 sign-in-required (${status} ${body?.code ?? "no code"})`, ok);
  return ok;
}

/**
 * Load a preview harness page. Returns true when it rendered; false (after
 * printing a SKIP) when the harness is closed on this server. A harness page
 * that is open but broken is a failure, not a skip.
 */
export async function openPreview(page, path, check, { base = BASE_URL, wait = 1200 } = {}) {
  const res = await page.goto(`${base}${path}`, { waitUntil: "load" });
  const status = res?.status() ?? 0;
  if (status === 404) {
    skip(`${path}: the preview harness is closed on this server (start it with VALLO_PREVIEW_HARNESS=1; it never opens on Vercel)`);
    return false;
  }
  await page.waitForTimeout(wait);
  check(`${path} (preview harness) renders without a server error (${status})`, status > 0 && status < 500);
  return status > 0 && status < 500;
}

/** Fill a field, retrying until hydration has stopped wiping it. */
async function fillHydrated(page, selector, value) {
  for (let i = 0; i < 40; i++) {
    await page.fill(selector, value);
    if ((await page.inputValue(selector)) === value) return;
    await page.waitForTimeout(250);
  }
}

/**
 * Sign the QA member in and return a storage state for new contexts, or null
 * with a SKIP printed when no credentials are set. Uses the email-first door
 * (`/sign-in` then `/sign-in/email`) and the passcode layer.
 */
export async function signInAsQa(browser, { base = BASE_URL, contextOptions = {} } = {}) {
  const creds = qaCredentials();
  if (!creds) {
    skip(QA_MISSING);
    return null;
  }
  const { passcodeReady } = await import("./_passcode.mjs");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...contextOptions });
  await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: base }]);
  const page = await ctx.newPage();
  await page.goto(`${base}/sign-in`, { waitUntil: "domcontentloaded" });
  await fillHydrated(page, "#auth-email", creds.email);
  await page.click("button:has-text('Continue')");
  await page.waitForSelector("#password", { timeout: 30_000 });
  await fillHydrated(page, "#password", creds.password);
  await page.click("button[type=submit]:has-text('Sign in')");
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 });
  await passcodeReady(ctx, page, { baseUrl: base });
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

/**
 * A signed-out context for a RETURNING visitor: `vallo_first_run=seen`, so
 * the sign-in door is shown rather than the first-run intro at `/welcome`
 * (which a brand-new browser is sent to first, by design).
 */
export async function signedOutContext(browser, contextOptions = {}, base = BASE_URL) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...contextOptions });
  await ctx.addCookies([{ name: "vallo_first_run", value: "seen", url: base }]);
  return ctx;
}

/** True when the page settled on the sign-in door (any of its steps). */
export function onSignInDoor(page) {
  return new URL(page.url()).pathname.startsWith("/sign-in");
}

/** A new context carrying the QA session, every tab already unlocked. */
export async function qaContext(browser, state, contextOptions = {}) {
  const { markEveryTab } = await import("./_passcode.mjs");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...contextOptions, storageState: state });
  await markEveryTab(ctx);
  return ctx;
}

/** Horizontal overflow of the document, in px. */
export function overflowOf(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
