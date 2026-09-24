import { namesMatch } from "./name-match";
import { isVnin, normaliseVnin } from "./nin";
import type { IdentityProvider } from "./provider";

/**
 * THE vNIN IDENTITY CHECK (V-49), with every effect injected so the whole
 * decision is proven with the stub provider. Production wiring: `actions.ts`.
 *
 * A clean match (NIMC knows the vNIN, the legal name matches the application
 * by the Nigerian-name rule, the liveness score clears the bar) PASSES the
 * identity rung with the vNIN service named as the decider. Anything else is
 * recorded and left PENDING for the human desk with the reason, never failed
 * by a machine: a broken NIMC record is common and is a question for a person.
 */

/** The liveness score a clean pass needs. Below it, a person looks. */
export const LIVENESS_PASS = 0.8;

export type VninCheckDeps = {
  provider: IdentityProvider;
  hmac(nin: string): string;
  /** `public.record_vnin_check`, as the service role. */
  record(input: {
    userId: string;
    legalName: string;
    ninHmac: string;
    reference: string;
    liveness: number;
    matched: boolean;
    note: string;
  }): Promise<string>;
};

export type VninOutcome =
  | { status: "passed" }
  | { status: "pending"; reason: string }
  | { status: "refused"; reason: "invalid_token" | "unconfigured" | "not_found" | "expired" | "failed" | "no_agent" };

export async function runVninCheck(
  deps: VninCheckDeps,
  input: { userId: string; vnin: string; applicationName: string },
): Promise<VninOutcome> {
  if (!isVnin(input.vnin)) return { status: "refused", reason: "invalid_token" };
  const answer = await deps.provider.verifyVnin({ vnin: normaliseVnin(input.vnin) });
  if (!answer.ok) return { status: "refused", reason: answer.reason };

  const name = namesMatch(answer.legalName, input.applicationName);
  const live = answer.liveness >= LIVENESS_PASS;
  const matched = name.match && live;
  const note = matched
    ? `Name check: ${name.reason}. Liveness ${answer.liveness.toFixed(2)}.`
    : `NIMC name ${answer.legalName} against application name ${input.applicationName}: ${name.reason}. Liveness ${answer.liveness.toFixed(2)}${live ? "" : ", below the bar"}.`;

  let result: string;
  try {
    result = await deps.record({
      userId: input.userId,
      legalName: answer.legalName,
      ninHmac: deps.hmac(answer.nin),
      reference: answer.reference,
      liveness: answer.liveness,
      matched,
      note,
    });
  } catch {
    return { status: "refused", reason: "failed" };
  }
  if (result === "passed") return { status: "passed" };
  if (result === "no_agent") return { status: "refused", reason: "no_agent" };
  if (result === "nin_elsewhere") return { status: "pending", reason: "nin_elsewhere" };
  if (result === "pending") return { status: "pending", reason: name.match ? "liveness" : "name" };
  return { status: "refused", reason: "failed" };
}
