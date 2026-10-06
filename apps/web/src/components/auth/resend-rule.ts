import { RESEND_WAIT_SECONDS } from "@/lib/auth/mail-app";

/**
 * THE RESEND RULES, AS THE SERVER ENFORCES THEM (W11, 6 October 2026).
 *
 * The brief for the code screens: a resend countdown driven by the REAL rule,
 * and never one that is not a real deadline. This is where the rule is
 * written down on the screen's side, so the countdown is computed from it and
 * from nothing else. There are two limits, and they are different kinds of
 * thing:
 *
 *   gapSeconds   the PACE. A code was sent a moment ago and a second one sent
 *                at once only races the first (A4), so the screen waits this
 *                long after any send. It is the screen's rule, held in
 *                `RESEND_WAIT_SECONDS` (`lib/auth/mail-app.ts`), and the
 *                countdown shows it honestly as exactly that: the time left
 *                since the last send.
 *   limit        the CEILING. At most this many sends inside one fixed window,
 *   windowSeconds  counted by the server per address (or per number) in
 *                `consume_rate_limit`, whose windows are aligned to the epoch
 *                (`supabase/migrations/20260730013645_rate_limits_and_
 *                idempotency.sql`: `floor(now / window) * window`). Because the
 *                window is aligned to the clock and not to the first send, the
 *                moment it ends is a real instant, `windowEnd`, which the
 *                screen can show without guessing.
 *
 * THE NUMBERS BELOW ARE THE SERVER'S, AND A TEST HOLDS THEM THERE
 * (`resend-clock.test.ts` reads the three call sites and fails if the
 * literals move). They are the per-ADDRESS buckets, because those are the
 * ones a person's own sends spend; the per-connection buckets are looser and
 * are not shown.
 *
 *   signUp       `sign_up_resend`           3 in 900s     lib/auth/actions.ts
 *   emailCode    `email_code_send_address`  5 in 3,600s   lib/auth/email-code.ts
 *   phoneCode    `phone_code_send_number`   4 in 3,600s   lib/auth/phone-sign-in.ts
 *
 * WHICH SENDS SPEND IT (`countsFirst`). The sign-up bucket is spent by
 * resends only: the first code goes out with the sign-up itself, through a
 * different path. The two code sign-in buckets are consumed by the send
 * action, and the FIRST send is that same action, so it spends one of the
 * five (or four) too. Counting only resends there showed a ready "Send a new
 * code" on the fifth resend that the server would refuse (audit A5).
 *
 * REQUEST TO SESSION 2 (not blocking): export these three from one pure
 * module the actions import, and return `retryAfterSeconds` on the refusal
 * (`AuthFormState`, `CodeSignInState`), so the screen can show the server's own
 * number rather than computing the same window. Until then the screen
 * computes it, and the test keeps the two from drifting.
 */
export type ResendRule = {
  gapSeconds: number;
  limit: number;
  windowSeconds: number;
  /** The first send spends the ceiling too (the same server bucket). */
  countsFirst: boolean;
};

export const RESEND_RULES = {
  signUp: { gapSeconds: RESEND_WAIT_SECONDS, limit: 3, windowSeconds: 900, countsFirst: false },
  emailCode: { gapSeconds: RESEND_WAIT_SECONDS, limit: 5, windowSeconds: 3_600, countsFirst: true },
  phoneCode: { gapSeconds: RESEND_WAIT_SECONDS, limit: 4, windowSeconds: 3_600, countsFirst: true },
} as const satisfies Record<string, ResendRule>;

export type ResendFlow = keyof typeof RESEND_RULES;
