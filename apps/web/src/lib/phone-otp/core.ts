/**
 * PHONE CONFIRMATION (V-50), THE PURE HALF. Client-safe: no I/O, no logging.
 *
 * The phone is the scarcity anchor: a mailbox costs nothing to multiply and a
 * working Nigerian SIM, tied to a registered identity by NIN-SIM linkage, does
 * not. So the product asks for a confirmed phone at three consequential
 * moments, and only at the first of each:
 *
 *   inspection  the first inspection request (it costs an agent a Saturday)
 *   review      the first review, a stay review or a tenancy review alike
 *   report      the first report that is NOT about immediate danger. A report
 *               that somebody is unsafe is never delayed by a code, ever.
 *
 * Everything else (browsing, saving, messaging) stays open, and a member is
 * never asked who they are: a phone is not an ID.
 */

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;

export type PhoneMoment = "inspection" | "review" | "report";

/** Report categories that are about immediate danger and are never gated. */
export const DANGER_CATEGORIES: readonly string[] = ["unsafe"];

/**
 * The opening words of the report V-05 files by itself when a renter answers
 * that money was asked for outside Vallo. That report is the renter's answer,
 * not a report they chose to write, so it is not their "first report".
 */
export const AUTO_REPORT_PREFIX = "Filed automatically from the questions after inspection";

/**
 * Does this earlier report count as the member's own first report? Not a
 * danger report (never gated, so it cannot have used up the moment) and not
 * one V-05 filed on their behalf.
 */
export function countsAsOwnReport(row: { category: string | null; reason: string | null }): boolean {
  if (row.category && DANGER_CATEGORIES.includes(row.category)) return false;
  if (typeof row.reason === "string" && row.reason.startsWith(AUTO_REPORT_PREFIX)) return false;
  return true;
}

/**
 * A six-digit code from a source of random integers. The source is injected so
 * the server passes `crypto.randomInt` and a test passes a fixed sequence.
 */
export function generateCode(randomInt: (maxExclusive: number) => number): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i += 1) code += String(randomInt(10));
  return code;
}

/**
 * The words that travel with the code. Short, no link, and the line that
 * protects the person: nobody from Vallo will ever ask for it. The code is
 * the only variable; nothing else about the account is in the message.
 */
export function otpMessage(code: string): string {
  return `Your Vallo code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Nobody from Vallo will ever ask you for it.`;
}

/**
 * Must this person confirm a phone before this action?
 *
 * Only with the flag on, only without a confirmed phone, only at the FIRST
 * action of its kind, and never for a danger report.
 */
export function phoneGateNeeded(input: {
  flagOn: boolean;
  confirmed: boolean;
  priorCount: number;
  moment: PhoneMoment;
  reportCategory?: string;
}): boolean {
  if (!input.flagOn || input.confirmed) return false;
  if (input.moment === "report" && input.reportCategory && DANGER_CATEGORIES.includes(input.reportCategory)) {
    return false;
  }
  return input.priorCount === 0;
}

/** What `public.phone_otp_issue` and `public.confirm_phone` answer. */
export type IssueOutcome = "issued" | "taken" | "already" | "invalid";
export type ConfirmOutcome = "confirmed" | "wrong" | "expired" | "locked" | "no_code" | "taken" | "signed_out";

export const ISSUE_OUTCOMES: readonly IssueOutcome[] = ["issued", "taken", "already", "invalid"];
export const CONFIRM_OUTCOMES: readonly ConfirmOutcome[] = [
  "confirmed",
  "wrong",
  "expired",
  "locked",
  "no_code",
  "taken",
  "signed_out",
];

export function isConfirmOutcome(value: unknown): value is ConfirmOutcome {
  return typeof value === "string" && (CONFIRM_OUTCOMES as readonly string[]).includes(value);
}

export function isIssueOutcome(value: unknown): value is IssueOutcome {
  return typeof value === "string" && (ISSUE_OUTCOMES as readonly string[]).includes(value);
}
