# The passcode: "Welcome back"

Every signed-in member has an account passcode: 6 digits by default, or 4. It is an app lock on top of the normal session, in the style of a banking app. It does **not** replace the password, Google or Apple. It decides whether a browser that is already signed in may show the app and move money right now.

This document is the design. The code is in `apps/web/src/lib/passcode/`, `apps/web/src/components/passcode/` and the migration `supabase/migrations/20260929034124_passcode_member_app_lock_code_bcrypt_only.sql`.

## 1. Setup

- **Who.** Every signed-in member. A new member meets it straight after account creation: sign-up lands on `/home`, and the `(app)` layout draws the setup screen instead of the page until a code is set. An existing member meets the same screen on their next visit to any page under `(app)`. It cannot be skipped. The only other way out is **Sign out**.
- **Length.** 6 digits by default. "Use a 4-digit passcode" on the first screen switches to 4, and back.
- **Twice.** The code is typed, then typed again on "Enter it again". A mismatch shakes the dots and starts again.
- **Trivial codes are refused.** These are refused on the screen before the code is sent (`lib/passcode/rules.ts`), and again by the database, which has the final say (`private.passcode_is_trivial`):
  - one repeated digit, for example `000000` or `1111`;
  - a straight run up or down, for example `123456`, `654321`, `1234` or `3456`;
  - the member's birth year, when it is known. Nothing on the platform collects a birth date today. The database reads `birth_year`, `birthdate` or `birthday` from the account's auth metadata if one ever appears. That is the hook.

## 2. Storage

- **Where.** `public.member_passcodes(user_id pk, hash, length, set_at, failed_count, locked_until, reset_required, updated_at)`, one row per member, cascading with `auth.users`.
- **Who can read it.** RLS is on and there is no policy. `anon` and `authenticated` hold no privilege on the table at all, so no member can read a hash, including their own. `service_role` keeps its usual access for support.
- **How it is hashed.** `extensions.crypt(code, extensions.gen_salt('bf', 10))`, bcrypt at cost 10. This only happens inside `SECURITY DEFINER` functions with `search_path ''`:

  | Function | Who may call it | What it does |
  |---|---|---|
  | `public.passcode_status()` | authenticated | Returns `unset`, `set` or `reset_required`, plus the length, the failure count and the cooldown. It never returns the hash. |
  | `public.passcode_set(p_code, p_length, p_current default null)` | authenticated | Sets the first code with no further proof. Replacing an existing code needs either the right current code (which is counted like any attempt) or a fresh sign-in: an `amr` entry in the verified token from the last 15 minutes. |
  | `public.passcode_verify(p_code)` | authenticated | Checks one attempt and counts it (section 4). |
  | `private.passcode_*` | nobody but the functions above | The trivial rule, the birth-year hook, the freshness check, the counted attempt and the audit write. |

- **Nothing leaks.** No function returns the hash, and nothing logs a code. The actions pass a code straight to the RPC and drop it. The audit rows carry the event, the length and the failure count, never a code. The migration's probe checks this.

## 3. The lock

The lock is the "Welcome back" screen.

### When it appears

- **In a new tab, or a new browser session.** The unlock cookie has no Max-Age, so it ends with the browser session. Each tab also keeps a mark in `sessionStorage`, and a tab without the mark locks when it opens.
- **After 5 minutes of inactivity.** Inactivity means no pointer, key, wheel, touch or scroll events.
- **After being hidden for 5 minutes or more.** This covers switching to another app or tab, or locking the phone (`visibilitychange`).
- **When the server's unlock lapses.** See "The unlocked state" below.

### The unlocked state

- **The cookie.** Unlocking is recorded in a short-lived, httpOnly, SameSite=Lax cookie, `vallo_unlock`. Its value is `v1.<user id>.<issued>.<expires>.<HMAC-SHA256>`.
- **Its key.** The HMAC key is derived from `SUPABASE_SERVICE_ROLE_KEY` under a purpose label, `lib/passcode/unlock-cookie.ts`. No generic cookie secret existed, and this adds no new environment variable. Rotating the service key asks everyone for their passcode again.
- **Who can write it.** Only the server: after a right code, after a new code is set, or after a full sign-in in the last 5 minutes.
- **It slides.** Every `POST /api/passcode/touch` re-signs it, and the browser sends one at most once a minute while the member is active. It lapses after 15 minutes with no touch, and after 12 hours in all.
- **It is tied to the user id.** A cookie minted for one account unlocks nothing for another.

### The gate

- **Where it runs.** `components/passcode/PasscodeGate.tsx` sits inside the `(app)` layout. That is a one-element edit, and `AppShell` is untouched.
- **What it draws.** It draws the page only when the session is unlocked. Otherwise it draws the lock or the setup screen *instead of* the page, so none of the page's markup reaches the browser.
- **The decision.** The rules are pure and tested in `lib/passcode/decide.ts`.
- **After unlocking.** A client guard, `PasscodeGuard.tsx`, wraps the page and runs the inactivity timer. When it locks, it clears the cookie through `lockPasscodeAction`, and the route re-renders as the lock.

### Money re-checks on the server

A locked session cannot pay, and cannot change where money is paid out.

- **Payments and bank accounts.** `guardMoney` in `lib/security/money-limits.ts` calls `passcodeMoneyRefusal` first. This covers card checkout, saved-card payments, card setup, the default card, removing a card, crypto payments, adding, resolving, defaulting or removing a bank account, and Guarantee claims. A refused call spends no rate-limit slot.
- **Payouts.** `moneyLockRefusalFor` in `lib/security/money-lock-guard.ts` does the same before the V-81 step-up is spent.
- **The exemptions.** The payment status polls (`paymentState`, `cryptoState`) and the crypto quote are not refused. They read the outcome of a payment already made, and a lock must not hide whether it went through.
- **It fails closed.** An unreadable state refuses.

### Never locked

- The public site.
- The auth pages.
- The signed-out catalogue (the gate answers `open` with no session).
- The consoles (`/admin`, `/agent`, `/host`), which have layouts of their own. See section 9.

### Never fails into the page

If the passcode cannot be read (an RPC error, or the function missing), the gate still draws the lock, with "We could not check your passcode just now" and **Use your password instead**. The only ways past it are:

- a valid unlock cookie, or
- a full sign-in in the last 5 minutes. The password was just typed, so this is the fallback to the password.

So the founder cannot be locked out by a broken table. Nobody is let through without authenticating either.

## 4. Brute force

- **5 wrong in a row** starts a 30-second cooldown. During it, even the right code answers "cooldown".
- **10 cumulative wrong attempts** set `reset_required`. A right code resets the count. The action then signs this browser out (`scope: local`) and sends the member to `/sign-in?notice=passcode-locked`. From then on the old code is useless everywhere. Every other signed-in device shows only "Sign in again". After a full sign-in, the setup screen asks for a new code.
- **Rate limits.** These use the existing `consume()` limiter:
  - verify: 30 per user and 120 per IP address in 10 minutes;
  - set: 12 per user per hour.

  The database's own count is what ends a guessing run. The IP limit stops one address from working through many accounts.
- **Audit.** `public.audit_log` gets a row, with entity type `member_passcode`, for each of these: `passcode.set`, `passcode.change`, `passcode.reset`, and `passcode.lockout` (with `kind` `cooldown` or `sign_out`).

## 5. Forgot the passcode

The lock, the setup screen and Settings all offer **Use your password instead**. Choosing it:

1. writes a signed, httpOnly `vallo_passcode_reset` cookie for this member, valid for 30 minutes;
2. signs this browser out;
3. sends the member to `/sign-in?notice=passcode-reset`, keeping a safe `next`.

After any full sign-in (password, Google, Apple or an emailed code), the fresh `amr` together with that cookie makes the gate draw "Set a new passcode". `passcode_set` accepts the new code without the old one because the token carries the fresh sign-in. This follows the same principle as `lib/auth/recovery-session.ts`.

## 6. Change it in Settings

The screen is under Settings, then Privacy and security, then **Passcode** (`/settings/passcode`).

- **Passcode length.** A 6 or 4 digits choice.
- **Change passcode.** This asks for the current code first, unless the member signed in within the last 15 minutes. It then asks for the new code twice.
- **Changing the length is changing the code.** A hash cannot be shortened, so a new length means a new code.
- **Forgotten.** The screen also offers Use your password instead.

## 7. The screens

- **The top.** The shared Slate block (`AuthCurveBlock`, compact, from `components/auth/slate.tsx`) is the same door as sign-in. In light mode it is brand navy and the rest of the screen is white. In dark mode the block is inverted to a light surface and the rest is dark.
- **Under the arc:**
  - the avatar, or the initial;
  - "Welcome back, {first name}";
  - 6 or 4 dots;
  - a status line;
  - a 3 by 4 keypad of large round keys, with a delete key and a press state (scale and fill), using the shared haptic grammar (`feedback("select")`);
  - **Use your password instead**.
- **The keyboard works too.** Digits type and Backspace deletes.
- **A wrong code** shakes the dots sideways and colours them with the error colour. The status line says how many tries are left before the pause, and then before the sign-out.
- **Reduced motion.** Under the system setting, or the app's own Motion "off", nothing moves: no shake, no scale, and the Slate block's drop and morph are off.
- **It is a real dialog.** The lock is a `<dialog>` promoted with `showModal()`, so everything behind it, including the shell's rail and tab bar, is inert. It cannot be dismissed with Escape.
- **Screenshots.** They are kept with the change that built this.

## 8. Native (Capacitor)

Biometric unlock is out of scope for now. The hook is `lib/passcode/native-unlock.ts`, and the keypad's empty bottom-left slot is where its button goes.

A biometric unlock must not trust a local "passed". It should run the V-81 WebAuthn ceremony that the money lock already has (`lib/security/webauthn.ts`, `money-step-up.ts`) with an `unlock` purpose. The server writes the unlock cookie only after verifying that assertion.

## 9. Known limits and open decisions

- **Forcing existing members.** Existing members are shown setup on their next visit, and it cannot be skipped (the only way out is Sign out). *Founder decision:* keep this, allow a "Later" for a grace period, or ask only at the next full sign-in.
- **The consoles.** `/admin`, `/agent` and `/host` are outside the `(app)` layout, so they are not visually locked. Their money actions are still refused on a locked session. *Founder decision:* add `PasscodeGate` to those layouts too.
- **The demo and reviewer account.** The account the app stores use will meet the setup screen. Set its passcode before submission and put it in the reviewer notes (`docs/STORE_SUBMISSION_NOTES.md`).
- **The browser specs.** The Playwright specs in `apps/web/tests/` that sign in and then walk `(app)` pages will stop at the setup screen until they set a code or seed one.
- **New tabs.** A new tab is detected in the browser. Its server-rendered page can paint for a moment before the lock covers it. The server boundary (the cookie, and money) is not affected.
- **Offline.** An offline tab locks locally, and unlocking it needs the network.
- **No key.** A deployment with no `SUPABASE_SERVICE_ROLE_KEY` cannot mint an unlock. Members then get in only for 5 minutes after each full sign-in. Every real deployment has the key.
