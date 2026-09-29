import "server-only";

/**
 * Which Paystack account this deployment talks to: LIVE or TEST.
 *
 * Before this file there was one key, `PAYSTACK_SECRET_KEY`, read everywhere,
 * so a Preview deployment with the live key charged real cards and there was
 * no way to point one environment at the sandbox without swapping the live key
 * out of it. The rule now, in full:
 *
 *  1. `PAYSTACK_MODE=live` or `PAYSTACK_MODE=test` is an explicit choice and
 *     always wins. `test` reads `PAYSTACK_TEST_SECRET_KEY`; `live` reads
 *     `PAYSTACK_SECRET_KEY`. An explicit test mode with no test key is NOT
 *     configured: it never falls back to the live key.
 *  2. Unset, on Vercel Production (`VERCEL_ENV=production`), the mode is live.
 *  3. Unset, anywhere else (Preview, Development, a laptop, the test suite),
 *     `PAYSTACK_TEST_SECRET_KEY` is used when it is present; otherwise
 *     `PAYSTACK_SECRET_KEY`, but only if that is a test key. A live key is
 *     refused outside Production unless `PAYSTACK_MODE=live` says so.
 *  4. `PAYSTACK_MODE=test` on Production is refused unless
 *     `PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION=yes` is set too.
 *
 * THE KEY ITSELF MUST AGREE. Paystack secret keys say which account they
 * belong to (`sk_test_...`, `sk_live_...`). A key whose prefix contradicts the
 * mode it was chosen for (a live key pasted into the test slot, or
 * `PAYSTACK_MODE=test` with a live key) is refused outright: the payment
 * service reports "not configured" rather than moving real money in a mode
 * that claims to be a sandbox. A key with neither prefix takes the mode of the
 * slot it came from.
 *
 * WHAT DOES NOT NEED A TEST TWIN. The browser holds no Paystack key: the
 * server initialises every transaction and the page resumes it by access code,
 * so `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` is read by nothing in either mode.
 * Paystack signs webhooks with the SECRET key of the account that sent them,
 * so the webhook check follows this selection with no separate secret.
 *
 * WHAT DOES. The Guarantee reserve is a subaccount, and subaccounts belong to
 * one mode: in test mode the reserve is `PAYSTACK_TEST_GUARANTEE_SUBACCOUNT`
 * and there is no fallback to the live code.
 *
 * Pure and environment-injected, so every row of the rule is a unit test.
 * Never logs or returns a key's value outside `secretKey`.
 */

export type PaystackMode = "live" | "test";

export type PaystackEnv = Readonly<Record<string, string | undefined>>;

export type PaystackSelection = {
  mode: PaystackMode;
  /** The secret key for that mode, or "" when the mode is not configured. */
  secretKey: string;
  /** The variable the key was read from, for the admin line. Never its value. */
  keyVariable: "PAYSTACK_SECRET_KEY" | "PAYSTACK_TEST_SECRET_KEY";
  /** How the mode was decided, in words an operator can check. */
  source: "explicit" | "production-default" | "non-production-test-key" | "non-production-fallback";
  /** Null when usable; otherwise why the key was refused. */
  problem: string | null;
};

function trimmed(env: PaystackEnv, name: string): string {
  return (env[name] ?? "").trim();
}

function prefixMode(key: string): PaystackMode | null {
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return null;
}

export function selectPaystack(env: PaystackEnv): PaystackSelection {
  const rawMode = trimmed(env, "PAYSTACK_MODE").toLowerCase();
  const live = trimmed(env, "PAYSTACK_SECRET_KEY");
  const test = trimmed(env, "PAYSTACK_TEST_SECRET_KEY");
  const production = trimmed(env, "VERCEL_ENV") === "production";

  if (rawMode.length > 0 && rawMode !== "live" && rawMode !== "test") {
    return {
      mode: production ? "live" : "test",
      secretKey: "",
      keyVariable: production ? "PAYSTACK_SECRET_KEY" : "PAYSTACK_TEST_SECRET_KEY",
      source: "explicit",
      problem: "PAYSTACK_MODE must be live or test.",
    };
  }

  let mode: PaystackMode;
  let key: string;
  let keyVariable: PaystackSelection["keyVariable"];
  let source: PaystackSelection["source"];

  if (rawMode === "test" || rawMode === "live") {
    mode = rawMode;
    keyVariable = rawMode === "test" ? "PAYSTACK_TEST_SECRET_KEY" : "PAYSTACK_SECRET_KEY";
    key = rawMode === "test" ? test : live;
    source = "explicit";
  } else if (production) {
    mode = "live";
    keyVariable = "PAYSTACK_SECRET_KEY";
    key = live;
    source = "production-default";
  } else if (test.length > 0) {
    mode = "test";
    keyVariable = "PAYSTACK_TEST_SECRET_KEY";
    key = test;
    source = "non-production-test-key";
  } else {
    /* The fallback every environment had before this file: the one key. Its
       own prefix says which account it is, so the mode is reported honestly. */
    keyVariable = "PAYSTACK_SECRET_KEY";
    key = live;
    mode = prefixMode(live) ?? "live";
    source = "non-production-fallback";
  }

  if (key.length === 0) {
    return { mode, secretKey: "", keyVariable, source, problem: `${keyVariable} is not set.` };
  }
  /* A non-production deployment never charges real cards by accident: the
     live key is used there only when somebody wrote PAYSTACK_MODE=live. */
  if (source === "non-production-fallback" && mode === "live") {
    return {
      mode,
      secretKey: "",
      keyVariable,
      source,
      problem:
        "This is not Production, and the only key is a live one. Set PAYSTACK_TEST_SECRET_KEY, or PAYSTACK_MODE=live to charge real cards here on purpose.",
    };
  }
  /* And Production never runs on the sandbox by accident: PAYSTACK_MODE=test
     there needs its own explicit opt-in, because a Production deployment in
     test mode would take bookings nobody pays for. */
  if (
    production &&
    mode === "test" &&
    trimmed(env, "PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION").toLowerCase() !== "yes"
  ) {
    return {
      mode,
      secretKey: "",
      keyVariable,
      source,
      problem: "PAYSTACK_MODE=test on Production also needs PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION=yes.",
    };
  }
  const keyMode = prefixMode(key);
  if (keyMode !== null && keyMode !== mode) {
    return {
      mode,
      secretKey: "",
      keyVariable,
      source,
      problem: `${keyVariable} holds a ${keyMode} key, but the mode is ${mode}.`,
    };
  }
  return { mode, secretKey: key, keyVariable, source, problem: null };
}

/** The Guarantee reserve subaccount for a mode. Null when not set up for it. */
export function reserveSubaccountFor(env: PaystackEnv, mode: PaystackMode): string | null {
  const code = trimmed(env, mode === "test" ? "PAYSTACK_TEST_GUARANTEE_SUBACCOUNT" : "PAYSTACK_GUARANTEE_SUBACCOUNT");
  return code.length > 0 ? code : null;
}

/** The environment as this process sees it, read at call time, never at import. */
export function currentPaystack(): PaystackSelection {
  return selectPaystack({
    PAYSTACK_MODE: process.env.PAYSTACK_MODE,
    PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION: process.env.PAYSTACK_ALLOW_TEST_MODE_IN_PRODUCTION,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    PAYSTACK_TEST_SECRET_KEY: process.env.PAYSTACK_TEST_SECRET_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}

/** The current mode, whether or not its key is usable. */
export function currentPaystackMode(): PaystackMode {
  return currentPaystack().mode;
}

/** The reserve subaccount for the current mode. */
export function currentReserveSubaccount(): string | null {
  return reserveSubaccountFor(
    {
      PAYSTACK_GUARANTEE_SUBACCOUNT: process.env.PAYSTACK_GUARANTEE_SUBACCOUNT,
      PAYSTACK_TEST_GUARANTEE_SUBACCOUNT: process.env.PAYSTACK_TEST_GUARANTEE_SUBACCOUNT,
    },
    currentPaystackMode(),
  );
}

/**
 * The read-only line the admin payments page shows. Names the mode, the
 * variable the key came from and why it is unusable when it is; never any
 * part of a key.
 */
export function describePaystackMode(selection: PaystackSelection): string {
  const mode =
    selection.mode === "test"
      ? "TEST (Paystack sandbox: no real money moves)"
      : "LIVE (real cards, real money)";
  const how = {
    explicit: "set by PAYSTACK_MODE",
    "production-default": "the Production default",
    "non-production-test-key": "a non-production deployment with a test key",
    "non-production-fallback": "a non-production deployment with no test key, so the one key there is",
  }[selection.source];
  const state = selection.problem ? ` Not usable: ${selection.problem}` : ` Key read from ${selection.keyVariable}.`;
  return `Paystack mode: ${mode}, ${how}.${state}`;
}
