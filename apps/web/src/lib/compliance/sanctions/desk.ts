/**
 * THE SANCTIONS LANE'S READ, SHAPED. SCUML item 8.
 *
 * Pure: the answer of `public.sanctions_desk()` (a staff-only definer
 * function) turned into the lane's view. Anything that is not the expected
 * shape is `unreadable`, never an empty desk: a failed read must never look
 * like "no matches".
 */

export type SanctionsList = { source: "un" | "ng"; activatedAt: string; entries: number; origin: string };
export type PendingDecision = { id: string; decision: "clear" | "confirm" | "release"; note: string; proposedBy: string; proposedAt: string };
export type WaitingList = {
  id: string;
  source: "un" | "ng";
  entries: number;
  previousEntries: number | null;
  origin: string;
  loadedBy: string | null;
  loadedAt: string;
  /** For a short URL list: who proposed it, waiting on a different person. */
  proposedBy: string | null;
};
export type SanctionsHit = {
  id: string;
  personId: string;
  source: "un" | "ng";
  reference: string;
  kind: "exact" | "fuzzy";
  score: number;
  screenedName: string;
  matchedName: string;
  createdAt: string;
  trigger: string;
  status: "open" | "confirmed";
  /** The listing's own dates of birth and nationalities, to check against. */
  datesOfBirth: string[];
  nationalities: string[];
  /** A confirmed match whose reference left a newer list version (item 9). */
  delisted: boolean;
  /** A close match on names common in Nigeria only: raised, shown in the lower group. */
  commonName: boolean;
  /** Whether a hold on the person's money is actually in force right now. */
  moneyHeld: boolean;
  /** Each desk's claim on the hold (sanctions, STR) and when it ends. */
  claims: { owner: string; until: string }[];
  pending: PendingDecision | null;
};
export type RecentScreening = { id: string; subject: "person" | "transaction"; trigger: string; outcome: string; at: string };

export type SanctionsDesk =
  | {
      state: "ok";
      me: string;
      lists: SanctionsList[];
      waitingLists: WaitingList[];
      hits: SanctionsHit[];
      recent: RecentScreening[];
      waiting: number;
    }
  | { state: "forbidden" }
  | { state: "unreadable" };

const str = (v: unknown): v is string => typeof v === "string";

export function readSanctionsDesk(data: unknown, error: unknown): SanctionsDesk {
  if (error || !data || typeof data !== "object") return { state: "unreadable" };
  const d = data as Record<string, unknown>;
  if (d.status === "forbidden") return { state: "forbidden" };
  if (d.status !== "ok" || !str(d.me) || !Array.isArray(d.lists) || !Array.isArray(d.hits) || !Array.isArray(d.recent)) {
    return { state: "unreadable" };
  }
  const hits: SanctionsHit[] = [];
  for (const raw of d.hits as Record<string, unknown>[]) {
    if (!str(raw.id) || !str(raw.personId) || !str(raw.reference) || (raw.kind !== "exact" && raw.kind !== "fuzzy")) return { state: "unreadable" };
    const p = raw.pending as Record<string, unknown> | null;
    hits.push({
      id: raw.id,
      personId: raw.personId,
      source: raw.source === "ng" ? "ng" : "un",
      reference: raw.reference,
      kind: raw.kind,
      score: Number(raw.score) || 0,
      screenedName: str(raw.screenedName) ? raw.screenedName : "",
      matchedName: str(raw.matchedName) ? raw.matchedName : "",
      createdAt: str(raw.createdAt) ? raw.createdAt : "",
      trigger: str(raw.trigger) ? raw.trigger : "manual",
      status: raw.status === "confirmed" ? "confirmed" : "open",
      datesOfBirth: Array.isArray(raw.datesOfBirth) ? raw.datesOfBirth.filter(str) : [],
      nationalities: Array.isArray(raw.nationalities) ? raw.nationalities.filter(str) : [],
      delisted: raw.delisted === true,
      commonName: raw.commonName === true,
      moneyHeld: raw.moneyHeld === true,
      claims: Array.isArray(raw.claims)
        ? (raw.claims as Record<string, unknown>[]).filter((c) => str(c.owner) && str(c.until)).map((c) => ({ owner: c.owner as string, until: c.until as string }))
        : [],
      pending:
        p && str(p.id) && (p.decision === "clear" || p.decision === "confirm" || p.decision === "release") && str(p.proposedBy)
          ? { id: p.id, decision: p.decision, note: str(p.note) ? p.note : "", proposedBy: p.proposedBy, proposedAt: str(p.proposedAt) ? p.proposedAt : "" }
          : null,
    });
  }
  return {
    state: "ok",
    me: d.me,
    lists: (d.lists as Record<string, unknown>[])
      .filter((l) => (l.source === "un" || l.source === "ng") && str(l.activatedAt))
      .map((l) => ({ source: l.source as "un" | "ng", activatedAt: l.activatedAt as string, entries: Number(l.entries) || 0, origin: str(l.origin) ? l.origin : "" })),
    waitingLists: (Array.isArray(d.waitingLists) ? (d.waitingLists as Record<string, unknown>[]) : [])
      .filter((l) => str(l.id) && (l.source === "un" || l.source === "ng"))
      .map((l) => ({
        id: l.id as string,
        source: l.source as "un" | "ng",
        entries: Number(l.entries) || 0,
        previousEntries: typeof l.previousEntries === "number" ? l.previousEntries : null,
        origin: str(l.origin) ? l.origin : "",
        loadedBy: str(l.loadedBy) ? l.loadedBy : null,
        loadedAt: str(l.loadedAt) ? l.loadedAt : "",
        proposedBy: str(l.proposedBy) ? l.proposedBy : null,
      })),
    hits,
    recent: (d.recent as Record<string, unknown>[])
      .filter((r) => str(r.id) && str(r.at))
      .map((r) => ({ id: r.id as string, subject: r.subject === "transaction" ? "transaction" : "person", trigger: str(r.trigger) ? r.trigger : "", outcome: str(r.outcome) ? r.outcome : "", at: r.at as string })),
    waiting: Number(d.waiting) || 0,
  };
}

/** The STR hand-off (SCUML item 6, builder 3's lane): the person and the hit it came from. */
export function strHref(hit: Pick<SanctionsHit, "id" | "personId">): string {
  return `/admin/compliance?tab=str&person=${encodeURIComponent(hit.personId)}&from=${encodeURIComponent(`sanctions:${hit.id}`)}`;
}
