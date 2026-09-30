/**
 * A2 and A3. The state a code sign-in form holds between its two steps:
 * asking for the address or number, then for the six digits. Client safe.
 * `error` is a key into the form's copy, never a sentence from the server.
 */
export type CodeSignInState = {
  step: "ask" | "code";
  /** The address or E.164 number the code went to, echoed back for step two. */
  target?: string;
  error?: "badTarget" | "badCode" | "wrongCode" | "limited" | "failed" | "off";
  /** The address the code went to, masked for display. */
  shown?: string;
};

export const CODE_START: CodeSignInState = { step: "ask" };

/** Six digits, and nothing else. */
export function isSixDigits(value: string): boolean {
  return /^\d{6}$/.test(value);
}
