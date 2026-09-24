/**
 * V-72: THE ENQUIRY DESK, AS PURE FUNCTIONS.
 *
 * Every listing enquiry has one stage: New, Replied, Viewing booked, Viewed,
 * Offer made, then Let or Lost (with one reason). Two sources say what it is:
 *
 *   - PROVEN, read live by `public.enquiry_stage_facts` (migration
 *     20260924121100): a reply from the lister, an inspection CONFIRMED, one
 *     COMPLETED, one COMPLETED with the outcome `deal_done`, a rent payment
 *     for this listing and this renter. Each comes with when it was proven.
 *   - SET BY HAND by the lister, in `enquiry_stages`, with when they set it.
 *
 * `deskStage` combines them, and the rules are the whole of this file:
 *
 *   1. A payment wins. Money that moved for this listing from this renter is
 *      Let, whatever anybody typed.
 *   2. Lost stands until an event AFTER the marking proves the enquiry moved
 *      on (a viewing confirmed next week reopens a thread marked lost today).
 *   3. Otherwise the further of the two wins, so a stage set by hand can run
 *      ahead of the proof (an offer made on the phone) and the proof can run
 *      ahead of the hand (the viewing was confirmed in the app).
 */

export const STAGES = ["new", "replied", "viewing_booked", "viewed", "offer", "let", "lost"] as const;
export type Stage = (typeof STAGES)[number];

/** The stages a lister can pick by hand ("new" clears what they set). */
export const MANUAL_STAGES: readonly Stage[] = STAGES;

export const LOST_REASONS = ["price", "fees", "location", "condition", "went_elsewhere", "no_response"] as const;
export type LostReason = (typeof LOST_REASONS)[number];

/** The order a stage sits in the pipeline. Lost is outside it and ranks nowhere. */
const RANK: Record<Exclude<Stage, "lost">, number> = {
  new: 0,
  replied: 1,
  viewing_booked: 2,
  viewed: 3,
  offer: 4,
  let: 5,
};

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

export function isLostReason(value: unknown): value is LostReason {
  return typeof value === "string" && (LOST_REASONS as readonly string[]).includes(value);
}

/** One row of `enquiry_stage_facts`, as the client returns it. */
export type StageFacts = {
  conversation_id: string;
  proven_stage: string | null;
  proven_at: string | null;
  manual_stage: string | null;
  lost_reason: string | null;
  manual_at: string | null;
};

export type DeskStage = {
  stage: Stage;
  /** Only on Lost. */
  lostReason: LostReason | null;
  /** Whether an event proves the stage shown, or the lister set it. */
  source: "proven" | "manual";
};

function time(iso: string | null): number {
  if (!iso) return Number.NEGATIVE_INFINITY;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

/** The stage one enquiry is at, from what is proven and what was set by hand. */
export function deskStage(facts: Pick<StageFacts, "proven_stage" | "proven_at" | "manual_stage" | "lost_reason" | "manual_at">): DeskStage {
  const proven: Exclude<Stage, "lost"> =
    isStage(facts.proven_stage) && facts.proven_stage !== "lost" ? facts.proven_stage : "new";
  const manual = isStage(facts.manual_stage) ? facts.manual_stage : null;

  if (proven === "let") return { stage: "let", lostReason: null, source: "proven" };

  if (manual === "lost") {
    const reopened = proven !== "new" && time(facts.proven_at) > time(facts.manual_at);
    if (!reopened) {
      return { stage: "lost", lostReason: isLostReason(facts.lost_reason) ? facts.lost_reason : null, source: "manual" };
    }
    return { stage: proven, lostReason: null, source: "proven" };
  }

  if (manual !== null && RANK[manual] > RANK[proven]) return { stage: manual, lostReason: null, source: "manual" };
  return { stage: proven, lostReason: null, source: "proven" };
}

/** The stage filter from the address bar; anything else is no stage filter. */
export function stageFilter(raw: string | string[] | undefined): Stage | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isStage(value) ? value : null;
}

/** How many enquiries sit at each stage, every stage present (zero included). */
export function countByStage(stages: Iterable<DeskStage>): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const entry of stages) counts[entry.stage] += 1;
  return counts;
}

/** Open means still being worked: not let and not lost. */
export function isOpen(stage: Stage): boolean {
  return stage !== "let" && stage !== "lost";
}
