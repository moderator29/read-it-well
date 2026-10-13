/**
 * THE LEADERBOARDS, AS DATA (D76).
 *
 * Two public boards: Referrals, and Top on Vallo with three sub-boards
 * (agents and landlords, hotels and stays, restaurants). Every board ranks by
 * a COUNT over a period (this Lagos month, or all time), City or Global, and
 * never by money: the founder's "highest earning agent" is answered with
 * completed deals, because a member's naira earnings shown publicly is a
 * privacy and safety problem in Nigeria and the count says the same thing.
 *
 * The read (`public.leaderboard`, supabase/migrations/pending/d76_*) returns
 * public-safe fields only. This module parses them defensively, orders the
 * podium, words the movement and the tier, and builds links. Pure; tested in
 * `model.test.ts`.
 */

export const BOARDS = ["referrals", "property", "hotels", "restaurants"] as const;
export type Board = (typeof BOARDS)[number];

/** The top level switch: Referrals, or Top on Vallo with its sub-boards. */
export type BoardGroup = "referrals" | "top";
export const TOP_BOARDS = ["property", "hotels", "restaurants"] as const satisfies readonly Board[];
export type TopBoard = (typeof TOP_BOARDS)[number];

export type Scope = "city" | "global";
export type Period = "month" | "all";

export function isBoard(value: unknown): value is Board {
  return typeof value === "string" && (BOARDS as readonly string[]).includes(value);
}

export function isTopBoard(value: unknown): value is TopBoard {
  return typeof value === "string" && (TOP_BOARDS as readonly string[]).includes(value);
}

export function groupOf(board: Board): BoardGroup {
  return board === "referrals" ? "referrals" : "top";
}

/** The board a URL asks for. Unknown values fall back, never throw. */
export function boardFromParams(params: { board?: string | string[]; sub?: string | string[] }): Board {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const board = one(params.board);
  const sub = one(params.sub);
  if (board === "top") return isTopBoard(sub) ? sub : "property";
  if (isBoard(board)) return board;
  return "referrals";
}

export function periodFromParams(value: string | string[] | undefined): Period {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "all" ? "all" : "month";
}

export type LeaderKind =
  | "member"
  | "agent"
  | "landlord"
  | "firm"
  | "hotel"
  | "resort"
  | "guest_house"
  | "serviced_apartments"
  | "shortlet_operator"
  | "restaurant";

export type LeaderRow = {
  rank: number;
  previousRank: number | null;
  kind: LeaderKind;
  name: string;
  /** A public handle (people) or a public page id (businesses); null when there is no page. */
  ref: string | null;
  avatarUrl: string | null;
  placeCode: string | null;
  placeName: string | null;
  verified: boolean;
  score: number;
  /** The count of the nearest rank above; null at the top. */
  nextScore: number | null;
  total: number;
  isMe: boolean;
};

const KINDS: readonly LeaderKind[] = [
  "member",
  "agent",
  "landlord",
  "firm",
  "hotel",
  "resort",
  "guest_house",
  "serviced_apartments",
  "shortlet_operator",
  "restaurant",
];

function int(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Rows from the read. A row missing its rank, name or count is dropped rather
 * than drawn with a guess; a zero count never reaches a board.
 */
export function parseRows(data: unknown): LeaderRow[] {
  if (!Array.isArray(data)) return [];
  const rows: LeaderRow[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const rank = int(r.rank);
    const score = int(r.score);
    const name = str(r.display_name);
    const kind = KINDS.includes(r.kind as LeaderKind) ? (r.kind as LeaderKind) : null;
    if (rank === null || rank < 1 || score === null || score < 1 || !name || !kind) continue;
    rows.push({
      rank,
      previousRank: int(r.previous_rank),
      kind,
      name,
      ref: str(r.ref),
      avatarUrl: str(r.avatar_url),
      placeCode: str(r.place_code),
      placeName: str(r.place_name),
      verified: r.verified === true,
      score,
      nextScore: int(r.next_score),
      total: int(r.total) ?? 0,
      isMe: r.is_me === true,
    });
  }
  return rows.sort((a, b) => a.rank - b.rank || b.score - a.score || a.name.localeCompare(b.name));
}

/** A stable key for a row across City and Global, so a row can move to its new place. */
export function rowKey(row: LeaderRow): string {
  return `${row.kind}:${row.ref ?? row.name}`;
}

/** The podium, left to right: second, first, third. Missing places are null. */
export function podium(rows: readonly LeaderRow[]): [LeaderRow | null, LeaderRow | null, LeaderRow | null] {
  const top = rows.slice(0, 3);
  return [top[1] ?? null, top[0] ?? null, top[2] ?? null];
}

/** Everyone after the podium. */
export function restOf(rows: readonly LeaderRow[]): LeaderRow[] {
  return rows.slice(3);
}

/** The caller's best row on this board, if they are on it. */
export function myRow(rows: readonly LeaderRow[]): LeaderRow | null {
  let best: LeaderRow | null = null;
  for (const r of rows) if (r.isMe && (!best || r.rank < best.rank)) best = r;
  return best;
}

export type Movement = { direction: "up" | "down" | "same" | "new"; by: number };

/** Movement since the last period. A change is a direction and a number, never colour alone. */
export function movement(row: Pick<LeaderRow, "rank" | "previousRank">): Movement {
  if (row.previousRank === null) return { direction: "new", by: 0 };
  const by = row.previousRank - row.rank;
  if (by > 0) return { direction: "up", by };
  if (by < 0) return { direction: "down", by: -by };
  return { direction: "same", by: 0 };
}

/** How many more it takes to reach the rank above; null at the top. */
export function toNextRank(row: Pick<LeaderRow, "score" | "nextScore">): number | null {
  if (row.nextScore === null || row.nextScore <= row.score) return null;
  return row.nextScore - row.score;
}

/*
 * TIERS FROM REAL THRESHOLDS. A tier word is a fact about the count shown,
 * never a badge handed out for being on the board. Gold is the top word and
 * platinum the one under it (D74: two metals, gold the higher tier).
 */
export type TierWord = "Rising" | "Trusted" | "Platinum" | "Gold";

export const TIER_THRESHOLDS: Record<Board, readonly [number, number, number, number]> = {
  /* Rising, Trusted, Platinum, Gold */
  referrals: [1, 5, 15, 40],
  property: [1, 3, 10, 25],
  hotels: [1, 10, 50, 150],
  restaurants: [1, 10, 50, 150],
};

const TIER_WORDS: readonly TierWord[] = ["Rising", "Trusted", "Platinum", "Gold"];

export function tierFor(board: Board, score: number): TierWord | null {
  const t = TIER_THRESHOLDS[board];
  let word: TierWord | null = null;
  for (let i = 0; i < t.length; i++) if (score >= t[i]!) word = TIER_WORDS[i]!;
  return word;
}

/** The next tier and how far it is; null at Gold. */
export function nextTier(board: Board, score: number): { word: TierWord; needed: number } | null {
  const t = TIER_THRESHOLDS[board];
  for (let i = 0; i < t.length; i++) if (score < t[i]!) return { word: TIER_WORDS[i]!, needed: t[i]! - score };
  return null;
}

/** Where a row opens. People open their public profile; a business its page. */
export function hrefFor(row: Pick<LeaderRow, "kind" | "ref">): string | null {
  if (!row.ref) return null;
  const ref = encodeURIComponent(row.ref);
  switch (row.kind) {
    case "member":
    case "agent":
    case "landlord":
      return `/u/${ref}`;
    case "restaurant":
      return `/restaurant/${ref}`;
    case "firm":
      return null;
    default:
      return `/stay/${ref}`;
  }
}

/** The leaderboard URL for a board, period and scope. */
export function boardHref(board: Board, period: Period, base = "/leaderboard"): string {
  const q = new URLSearchParams();
  if (board === "referrals") q.set("board", "referrals");
  else {
    q.set("board", "top");
    q.set("sub", board);
  }
  if (period === "all") q.set("period", "all");
  return `${base}?${q.toString()}`;
}

/** Initials for a portrait without a photograph. */
export function monogram(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "V";
  const first = words[0]!.charAt(0);
  const second = words.length > 1 ? words[words.length - 1]!.charAt(0) : "";
  return (first + second).toUpperCase();
}

/**
 * Deterministic confetti (MOTION_SYSTEM principle 7: seeded, never a raw
 * random call), so the payoff looks the same on every run and can be tested.
 */
export function confettiPieces(count: number, seed = 76): { x: number; delay: number; drift: number; turn: number; tone: 0 | 1 | 2 }[] {
  let s = seed >>> 0;
  const next = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: Math.round(next() * 100),
    delay: Math.round(next() * 360),
    drift: Math.round((next() - 0.5) * 80),
    turn: Math.round((next() - 0.5) * 720),
    tone: Math.floor(next() * 3) as 0 | 1 | 2,
  }));
}
