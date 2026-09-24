import { generateCode, isIssueOutcome, otpMessage, type IssueOutcome } from "./core";
import type { OtpTransport } from "./transport";

/**
 * SENDING A CODE (V-50), with every effect injected so the flow is proven with
 * the capturing transport. The production wiring is `actions.ts`.
 *
 * ORDER MATTERS. The hash is stored BEFORE the code is sent, so a code that
 * arrives can always be confirmed; and the code itself never leaves this
 * function except into the transport. It is not returned, not logged, not
 * stored.
 */

export type SendDeps = {
  randomInt(maxExclusive: number): number;
  /** `public.phone_otp_issue`, as the service role. */
  issue(userId: string, phone: string, code: string): Promise<unknown>;
  transport: OtpTransport;
  /** The per-person and per-number allowance. False means refused or unknown. */
  allow(userId: string, phone: string): Promise<boolean>;
};

export type SendOutcome =
  | { ok: true }
  | { ok: false; reason: "limited" | "taken" | "already" | "invalid" | "unconfigured" | "failed" };

export async function runSendCode(deps: SendDeps, userId: string, phoneE164: string): Promise<SendOutcome> {
  if (!(await deps.allow(userId, phoneE164))) return { ok: false, reason: "limited" };
  const code = generateCode(deps.randomInt);
  let issued: IssueOutcome;
  try {
    const answer = await deps.issue(userId, phoneE164, code);
    issued = isIssueOutcome(answer) ? answer : "invalid";
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (issued !== "issued") return { ok: false, reason: issued };
  const sent = await deps.transport.send(phoneE164, otpMessage(code));
  return sent.ok ? { ok: true } : { ok: false, reason: sent.reason };
}
