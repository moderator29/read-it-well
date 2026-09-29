/**
 * THE PASSCODE, FOR A BROWSER SPEC. docs/PASSCODE.md, "Browser specs".
 *
 * Every signed-in member now meets the passcode layer: the setup screen until
 * a code exists, and the "Welcome back" lock in every new tab and after five
 * idle minutes. A spec that signs in and then walks `(app)`, `/agent`,
 * `/host` or `/admin` pages would stop at it. After the spec's own sign-in,
 * one call gets it through, the way a member would:
 *
 *     import { passcodeReady } from "./_passcode.mjs";
 *     // ...sign in as the QA member...
 *     await passcodeReady(ctx, page);
 *
 * What it does, in order:
 *
 *   1. Marks every tab this context opens as already unlocked (the
 *      sessionStorage mark `PasscodeGuard` looks for), so a new page is not
 *      locked on arrival as a real new tab would be.
 *   2. If the setup screen is showing (the QA account has no code yet), types
 *      `QA_MEMBER_PASSCODE` (default 480913) twice on the real keypad. That is
 *      the seed: the code is set through `passcode_set` like anybody's.
 *   3. Posts `/api/passcode/touch`. Straight after a full sign-in the server
 *      counts the session as fresh and writes the signed `vallo_unlock`
 *      cookie into this context's jar, so later pages, and any context made
 *      from `storageState`, stay unlocked for fifteen idle minutes.
 *
 * For a run longer than that, or a context built without signing in,
 * `addUnlockCookie` writes the same cookie directly. It needs the server's
 * own `SUPABASE_SERVICE_ROLE_KEY` in the spec's environment, because the key
 * is derived from it (`src/lib/passcode/unlock-cookie.ts`, kept in step by
 * `src/lib/passcode/spec-helper.test.ts`). Never commit that key.
 *
 * If the QA account's code is already set to something else and the session
 * is not fresh, the lock appears: set QA_MEMBER_PASSCODE to that code and
 * `passcodeReady` types it.
 */
import { createHmac } from "node:crypto";

export const TAB_KEY = "vallo.passcode.tab";
export const UNLOCK_COOKIE = "vallo_unlock";
export const DEFAULT_SPEC_PASSCODE = "480913";
const UNLOCK_IDLE_SECONDS = 15 * 60;
const UNLOCK_MAX_SECONDS = 12 * 60 * 60;

export function specPasscode() {
  return process.env.QA_MEMBER_PASSCODE || DEFAULT_SPEC_PASSCODE;
}

/** Step 1: every page in this context starts as an unlocked tab. */
export async function markEveryTab(context) {
  await context.addInitScript((key) => {
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* A page with no storage is locked, as a real one would be. */
    }
  }, TAB_KEY);
}

async function typeCode(page, code) {
  for (const digit of code) {
    await page.locator(".nf-passcode__key", { hasText: new RegExp(`^${digit}$`) }).first().click();
  }
}

/** The whole routine: mark tabs, seed through setup if needed, unlock. */
export async function passcodeReady(context, page, { baseUrl = process.env.BASE_URL, code = specPasscode() } = {}) {
  await markEveryTab(context);
  await page.evaluate((key) => {
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* See markEveryTab. */
    }
  }, TAB_KEY).catch(() => {});

  const setup = page.locator('[data-testid="passcode-setup-enter"]');
  if (await setup.isVisible().catch(() => false)) {
    await typeCode(page, code);
    await page.locator('[data-testid="passcode-setup-confirm"]').waitFor({ timeout: 15000 });
    await typeCode(page, code);
    await setup.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  }

  const lock = page.locator('[data-testid="passcode-lock"] [data-testid="passcode-keypad"]');
  if (await lock.isVisible().catch(() => false)) {
    await typeCode(page, code);
    await lock.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  }

  const origin = baseUrl || new URL(page.url()).origin;
  const answer = await page.request.post(`${origin}/api/passcode/touch`).catch(() => null);
  const body = answer ? await answer.json().catch(() => ({})) : {};
  return { state: body.state ?? "unknown" };
}

/** The cookie `lib/passcode/unlock-cookie.ts` writes, for this user, now. */
export function unlockCookieValue(userId, serviceRoleKey, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!serviceRoleKey || serviceRoleKey.length < 16) throw new Error("unlock cookie: the server's service role key is needed");
  const key = createHmac("sha256", serviceRoleKey).update("vallo.passcode.unlock.v1").digest();
  const expiresAt = Math.min(nowSeconds + UNLOCK_IDLE_SECONDS, nowSeconds + UNLOCK_MAX_SECONDS);
  const body = `v1.${userId}.${nowSeconds}.${expiresAt}`;
  return `${body}.${createHmac("sha256", key).update(body).digest("base64url")}`;
}

/** The signed-in user's id, read from this context's Supabase session cookie. */
export async function sessionUserId(context) {
  const cookies = await context.cookies();
  const parts = cookies
    .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  if (parts.length === 0) return null;
  let raw = parts.map((c) => decodeURIComponent(c.value)).join("");
  if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64url").toString("utf8");
  try {
    const token = JSON.parse(raw).access_token;
    const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

/** Write the unlock straight into the context (needs SUPABASE_SERVICE_ROLE_KEY). */
export async function addUnlockCookie(context, { baseUrl = process.env.BASE_URL, serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY } = {}) {
  const userId = await sessionUserId(context);
  if (!userId) throw new Error("unlock cookie: sign in first");
  await markEveryTab(context);
  await context.addCookies([
    { name: UNLOCK_COOKIE, value: unlockCookieValue(userId, serviceRoleKey), url: baseUrl, httpOnly: true, sameSite: "Lax" },
  ]);
}
