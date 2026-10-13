import { VERIFICATION_ORDER, type VerificationRung } from "@/lib/trust/verification";

/**
 * THE VERIFICATION PATH, AS A MODEL (reference 7110: a progress path with
 * ticks; north star 10 F: each rung names what was actually checked).
 *
 * Pure, so it is tested. It PRESENTS what the records say and decides nothing:
 * the ladder's rungs are `agent_verification_checks` rows a named member of
 * staff decided (`lib/agent/verification-queries.ts`), and the tier is not
 * recomputed here. Each rung carries the sentence the ladder itself publishes
 * for what a reviewer looks at (`VERIFICATION_LADDER[kind].evidence`), so the
 * path and the standards page can never promise different things.
 *
 * Four states, and a rung is never "passed" without a decision behind it:
 *
 *   passed    a reviewer passed it (a date, from the decision)
 *   failed    a reviewer refused it (their own note, in full)
 *   current   the first rung not yet passed and not refused: what is next, or
 *             what a reviewer is looking at now
 *   upcoming  further down the ladder
 *
 * Someone with no `agents` row has no ladder. If they have filed identity and
 * address documents, those two rungs follow the documents' own review state
 * (the same read `/verification` already makes); with no filing, every rung is
 * simply upcoming, which is true.
 */

export type PathState = "passed" | "failed" | "current" | "upcoming";

export type PathRung = {
  key: VerificationRung;
  label: string;
  /** What a reviewer looks at for this rung. */
  evidence: string;
  state: PathState;
  /** ISO timestamp of the decision, for a decided rung. */
  decidedAt: string | null;
  /** The reviewer's own words, for a refused rung. */
  note: string | null;
  /** A word for a rung whose state needs one the generic labels do not say. */
  word: "passed" | "failed" | "inReview" | "documentsApproved" | "documentsRejected" | "next" | "later";
};

export type LadderInput = {
  rungs: Partial<Record<VerificationRung, { status: "passed" | "failed"; note: string | null; decidedAt: string }>>;
};

export type DocumentsInput = { state: "none" | "pending" | "rejected" | "approved" };

export function buildPath(input: { ladder: LadderInput | null; documents: DocumentsInput | null }): PathRung[] {
  const { ladder, documents } = input;
  let currentTaken = false;

  return VERIFICATION_ORDER.map((definition): PathRung => {
    const base = { key: definition.kind, label: definition.label, evidence: definition.evidence, decidedAt: null, note: null };

    if (ladder) {
      const decision = ladder.rungs[definition.kind];
      if (decision?.status === "passed") {
        return { ...base, state: "passed", decidedAt: decision.decidedAt, word: "passed" };
      }
      if (decision?.status === "failed") {
        currentTaken = true;
        return { ...base, state: "failed", decidedAt: decision.decidedAt, note: decision.note, word: "failed" };
      }
      if (!currentTaken) {
        currentTaken = true;
        return { ...base, state: "current", word: "next" };
      }
      return { ...base, state: "upcoming", word: "later" };
    }

    const filed = definition.kind === "identity" || definition.kind === "address";
    if (filed && documents && documents.state !== "none") {
      if (documents.state === "approved") return { ...base, state: "passed", word: "documentsApproved" };
      return {
        ...base,
        state: "current",
        word: documents.state === "rejected" ? "documentsRejected" : "inReview",
      };
    }
    return { ...base, state: "upcoming", word: "later" };
  });
}

/** How many rungs have been passed, for the line above the path. */
export function passedCount(path: readonly PathRung[]): number {
  return path.filter((rung) => rung.state === "passed").length;
}
