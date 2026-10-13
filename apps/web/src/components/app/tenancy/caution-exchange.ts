import type { ChipState } from "@/components/ui/StatusChip";
import type { CautionState } from "@/lib/tenancy/model";
import type { TenancyCaution, TenancyCautionReturn, TenancyDeduction } from "@/lib/tenancy/queries";

/**
 * M2: THE CAUTION REGISTER AS A DOCUMENTED EXCHANGE. Pure and client-safe.
 *
 * A caution is a debt between two people that Vallo records and does not
 * hold. When a landlord keeps part of it, the tenant answers, and Vallo
 * staff rule on what is disputed, each of those is a statement made by
 * somebody, in order. This turns the register the tenancy read already
 * returns (V-36) into that order: one thread per deduction and one per
 * return, each a run of entries saying who did what.
 *
 * THREE RULES, each held by the test beside this file.
 *
 *   1. BOTH PARTIES SEE THE SAME ENTRIES. Nothing here takes the viewer: the
 *      exchange is a function of the record alone, so the tenant and the
 *      landlord or agent cannot be shown two different stories. Who may act
 *      on an entry (answer, contest) is the page's business, below the
 *      document, never a different entry.
 *   2. NO RULING APPEARS BEFORE IT IS MADE. A ruling entry exists only when
 *      the record holds the ruling (`ruledAllowed` on a deduction, `ruling`
 *      on a return). Until then the thread ends on "waiting for Vallo staff
 *      to rule", which carries no figure and no outcome.
 *   3. NOTHING IS INVENTED. Every amount is the read's own formatted figure
 *      (formatMoney, in the query), every date is one the record holds (a
 *      return's date paid); a moment the read does not date carries no date.
 *
 * Each entry carries a MARK in StatusChip's shape grammar, so a state is a
 * word and a shape, never colour alone:
 *
 *   done       filled circle   a statement was made: proposed, accepted,
 *                              returned, ruled
 *   waiting    hollow circle   somebody has not answered yet
 *   disputed   diamond         raised and being looked at (never red)
 *   stopped    filled square   staff found a recorded return did not arrive
 */

export type ExchangeActor = "lister" | "tenant" | "vallo";
export type ExchangeMark = "done" | "waiting" | "disputed" | "stopped";

export type ExchangeEntry =
  | { key: string; actor: "lister"; kind: "proposed"; mark: "done" }
  | { key: string; actor: "tenant"; kind: "accepted"; mark: "done" }
  | { key: string; actor: "tenant"; kind: "disputed"; mark: "disputed" }
  | { key: string; actor: "tenant"; kind: "awaiting-answer"; mark: "waiting" }
  | { key: string; actor: "vallo"; kind: "ruled"; mark: "done"; allowed: string; reason: string | null }
  | { key: string; actor: "vallo"; kind: "awaiting-ruling"; mark: "waiting" }
  | { key: string; actor: "lister"; kind: "returned"; mark: "done"; date: string }
  | { key: string; actor: "tenant"; kind: "received"; mark: "done"; date: string }
  | { key: string; actor: "tenant"; kind: "contested"; mark: "disputed" }
  | {
      key: string;
      actor: "vallo";
      kind: "found";
      outcome: "received" | "not_received";
      mark: "done" | "stopped";
      reason: string | null;
    };

export type DeductionThread = { key: string; n: number; deduction: TenancyDeduction; entries: ExchangeEntry[] };
export type ReturnThread = { key: string; n: number; record: TenancyCautionReturn; entries: ExchangeEntry[] };

export type CautionExchange = { deductions: DeductionThread[]; returns: ReturnThread[] };

/** One deduction: proposed, then the tenant's answer, then a ruling only if disputed. */
export function deductionThread(d: TenancyDeduction, n: number): DeductionThread {
  const key = `d-${d.id}`;
  const entries: ExchangeEntry[] = [{ key: `${key}-proposed`, actor: "lister", kind: "proposed", mark: "done" }];
  if (d.answer === "accepted") {
    entries.push({ key: `${key}-accepted`, actor: "tenant", kind: "accepted", mark: "done" });
  } else if (d.answer === "disputed") {
    entries.push({ key: `${key}-disputed`, actor: "tenant", kind: "disputed", mark: "disputed" });
    entries.push(
      d.ruledAllowed !== null
        ? { key: `${key}-ruled`, actor: "vallo", kind: "ruled", mark: "done", allowed: d.ruledAllowed, reason: d.ruledReason }
        : { key: `${key}-awaiting-ruling`, actor: "vallo", kind: "awaiting-ruling", mark: "waiting" },
    );
  } else {
    entries.push({ key: `${key}-awaiting-answer`, actor: "tenant", kind: "awaiting-answer", mark: "waiting" });
  }
  return { key, n, deduction: d, entries };
}

/** One return: recorded by a side, then contested and ruled only if it was contested. */
export function returnThread(r: TenancyCautionReturn, n: number): ReturnThread {
  const key = `r-${r.id}`;
  const entries: ExchangeEntry[] = [
    r.recordedAs === "lister_sent"
      ? { key: `${key}-returned`, actor: "lister", kind: "returned", mark: "done", date: r.date }
      : { key: `${key}-received`, actor: "tenant", kind: "received", mark: "done", date: r.date },
  ];
  if (r.contested) {
    entries.push({ key: `${key}-contested`, actor: "tenant", kind: "contested", mark: "disputed" });
    entries.push(
      r.ruling !== null
        ? {
            key: `${key}-found`,
            actor: "vallo",
            kind: "found",
            outcome: r.ruling,
            mark: r.ruling === "received" ? "done" : "stopped",
            reason: r.rulingReason,
          }
        : { key: `${key}-awaiting-ruling`, actor: "vallo", kind: "awaiting-ruling", mark: "waiting" },
    );
  }
  return { key, n, record: r, entries };
}

/** The whole register, in the read's own order (deductions by proposal, returns by record). */
export function cautionExchange(caution: Pick<TenancyCaution, "deductions" | "returns">): CautionExchange {
  return {
    deductions: caution.deductions.map((d, i) => deductionThread(d, i + 1)),
    returns: caution.returns.map((r, i) => returnThread(r, i + 1)),
  };
}

/** The register's state as a chip: a word (the locale's) and a shape, never colour alone. */
export const CAUTION_CHIP: Record<CautionState, ChipState> = {
  open: "pending",
  deductions_proposed: "pending",
  agreed: "pending",
  disputed: "disputed",
  escalated: "disputed",
  returned: "success",
};
