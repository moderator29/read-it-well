/**
 * THE PURE HALF OF THE REFERRAL DESK (`referrals.ts` reads; this decides).
 *
 * Nothing here touches the database or the network, so every rule below is
 * tested without either. What it holds:
 *
 *   - the desk's address (`?tab=`, `?member=`), the same way the visits desk
 *     keeps its state in the address, so a link to "the fraud view with this
 *     member's graph open" is a link;
 *   - which referral statuses count as qualified, pending and reversed on the
 *     top row (the live statuses are `referrals_status_lifecycle`);
 *   - the plain words for a risk reason, a requirement key and a signal;
 *   - the review window as a plain sentence;
 *   - the layout of the invitation graph.
 *
 * Money is integer kobo throughout. Nothing here divides by a hundred except
 * a figure shown to a person, and that goes through `formatMoney`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const REFERRAL_TABS = ["review", "fraud", "payouts"] as const;
export type ReferralTab = (typeof REFERRAL_TABS)[number];

export type ReferralQuery = {
  tab: ReferralTab;
  /** The member whose invitation graph is drawn in the fraud view. */
  member: string | null;
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** The desk's state from its address; anything malformed is dropped, never trusted. */
export function readReferralQuery(params: Record<string, string | string[] | undefined>): ReferralQuery {
  const tab = one(params.tab);
  const member = one(params.member)?.trim();
  return {
    tab: (REFERRAL_TABS as readonly string[]).includes(tab ?? "") ? (tab as ReferralTab) : "review",
    member: isUuid(member) ? member : null,
  };
}

export const REFERRALS_BASE = "/admin/referrals";

/** The address of the desk with some of its state changed. Defaults are left out. */
export function referralsHref(query: ReferralQuery, patch: Partial<ReferralQuery> = {}): string {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.tab !== "review") params.set("tab", next.tab);
  if (next.member) params.set("member", next.member);
  const qs = params.toString();
  return qs ? `${REFERRALS_BASE}?${qs}` : REFERRALS_BASE;
}

/* ------------------------------------------------------------------ months */

/**
 * The first of this Lagos month and of the next, as `YYYY-MM-01`: the only two
 * a budget can be set for. Lagos is UTC+1 all year, so a Lagos month is a fixed
 * hour away from a UTC one.
 */
export function budgetMonths(now: number): { current: string; next: string } {
  const lagos = new Date(now + 3_600_000).toISOString();
  const y = Number(lagos.slice(0, 4));
  const m = Number(lagos.slice(5, 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    current: `${y}-${pad(m)}-01`,
    next: m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`,
  };
}

/* ----------------------------------------------------------------- statuses */

/** Every status `public.referrals` can hold (`referrals_status_lifecycle`). */
export const REFERRAL_STATUSES = [
  "attributed",
  "qualified",
  "pending",
  "under_review",
  "approved",
  "available",
  "withdrawal_requested",
  "sent",
  "paid",
  "rejected",
  "reversed",
] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

/**
 * The three buckets on the desk's top row, exclusive and exhaustive:
 *
 *   qualified  earned and past review: approved, available, or on its way out
 *              (a withdrawal asked for, sent, paid)
 *   pending    not earned yet: the invited person has signed up but not met the
 *              terms (attributed), is inside the review window (qualified,
 *              pending), or is waiting on a person (under_review)
 *   reversed   taken back or refused: reversed, rejected
 */
export const QUALIFIED_STATUSES: readonly ReferralStatus[] = ["approved", "available", "withdrawal_requested", "sent", "paid"];
export const PENDING_STATUSES: readonly ReferralStatus[] = ["attributed", "qualified", "pending", "under_review"];
export const REVERSED_STATUSES: readonly ReferralStatus[] = ["rejected", "reversed"];

export type StatusCounts = Readonly<Record<ReferralStatus, number>>;

export function emptyStatusCounts(): Record<ReferralStatus, number> {
  return Object.fromEntries(REFERRAL_STATUSES.map((s) => [s, 0])) as Record<ReferralStatus, number>;
}

export type Buckets = { qualified: number; pending: number; reversed: number; total: number };

export function bucketCounts(counts: StatusCounts): Buckets {
  const sum = (list: readonly ReferralStatus[]) => list.reduce((n, s) => n + (counts[s] ?? 0), 0);
  const qualified = sum(QUALIFIED_STATUSES);
  const pending = sum(PENDING_STATUSES);
  const reversed = sum(REVERSED_STATUSES);
  return { qualified, pending, reversed, total: qualified + pending + reversed };
}

/** Narrow an unknown status to a known one (a value the database adds later reads as unknown, not as a guess). */
export function asReferralStatus(value: unknown): ReferralStatus | null {
  return (REFERRAL_STATUSES as readonly unknown[]).includes(value) ? (value as ReferralStatus) : null;
}

/** Rewards payout statuses (`rewards_payouts_status_lifecycle`). */
export const PAYOUT_STATUSES = ["under_review", "processing", "sent", "unknown", "paid", "failed"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export function asPayoutStatus(value: unknown): PayoutStatus | null {
  return (PAYOUT_STATUSES as readonly unknown[]).includes(value) ? (value as PayoutStatus) : null;
}

/** A payout that has been in flight this long without a confirmation can be marked never sent (the database refuses sooner). */
export const STUCK_AFTER_HOURS = 24;

export function isStuck(status: PayoutStatus | null, createdAt: string, now: number): boolean {
  if (status !== "processing" && status !== "sent" && status !== "unknown") return false;
  const made = Date.parse(createdAt);
  return Number.isFinite(made) && made < now - STUCK_AFTER_HOURS * 3_600_000;
}

/* ------------------------------------------------------------------- words */

/** A reason code the risk functions write, in a sentence a person can act on. Unknown codes read as their own words. */
export function riskReasonWords(code: string, words: Readonly<Record<string, string>>): string {
  return words[code] ?? code.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** The reasons out of a jsonb array, dropping anything that is not a short string. */
export function reasonList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 64);
}

/** What a campaign requirement key asks of the invited person, in words. */
export function requirementWords(key: string, words: Readonly<Record<string, string>>): string {
  return words[key] ?? key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * A Postgres interval as PostgREST hands it back ("7 days", "1 day 12:00:00",
 * "168:00:00") in whole days and hours. Anything else reads as null, so the
 * desk prints no window rather than a wrong one.
 */
export function intervalParts(raw: unknown): { days: number; hours: number } | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  const match = /^(?:(\d+)\s+days?)?\s*(?:(\d+):(\d{2}):(\d{2}))?$/.exec(text);
  if (!match || text === "") return null;
  const days = match[1] ? Number(match[1]) : 0;
  const clock = match[2] ? Number(match[2]) : 0;
  const total = days * 24 + clock;
  return { days: Math.floor(total / 24), hours: total % 24 };
}

/**
 * A signal id from `admin_referral_clusters` ("device:ab12cd34ef56",
 * "network:102.89.23.14"), as a kind and a masked token. The desk says that
 * accounts shared a browser or a network; it does not print a network address
 * or a full device fingerprint, because naming the group is enough to act on
 * and the raw value is more personal data than the decision needs.
 */
export function readSignal(signal: string): { kind: "device" | "network" | "other"; token: string } {
  const at = signal.indexOf(":");
  const kind = at > 0 ? signal.slice(0, at) : "";
  const value = at > 0 ? signal.slice(at + 1) : signal;
  if (kind === "device") return { kind: "device", token: value.slice(0, 4) };
  if (kind === "network") {
    if (value.includes(".")) {
      const parts = value.split(".");
      return { kind: "network", token: `${parts.slice(0, 2).join(".")}.x.x` };
    }
    return { kind: "network", token: `${value.split(":").slice(0, 2).join(":")}::x` };
  }
  return { kind: "other", token: "" };
}

/** A short label for a person the desk names by id only: their display name, or "Member ab12". */
export function memberLabel(id: string, name: string | null | undefined, fallback: string): string {
  const clean = (name ?? "").trim();
  return clean.length > 0 ? clean : fallback.replace("{id}", id.slice(0, 4));
}

/* -------------------------------------------------------------------- graph */

export type GraphEdge = {
  referrerId: string;
  referredId: string;
  status: string;
  riskScore: number;
  riskReasons: string[];
  depth: number;
};

export type GraphNode = {
  id: string;
  col: number;
  x: number;
  y: number;
  focus: boolean;
  /** The risk score on the invitation that brought them in, or null for a root. */
  risk: number | null;
  status: string | null;
};

export type GraphLink = {
  from: string;
  to: string;
  /** A tree link joins an inviter to someone they brought in; a back link closes a loop (an invitation that came back round). */
  kind: "tree" | "back";
  /** An SVG path from the right edge of the inviter to the left edge of the invited. */
  path: string;
};

export type GraphLayout = {
  width: number;
  height: number;
  nodes: GraphNode[];
  links: GraphLink[];
  /** Members in the read, and how many were drawn when the read was larger than the cap. */
  total: number;
  drawn: number;
  truncated: boolean;
  /** True when some invitation closes a loop: somebody ended up inviting their own inviter. */
  hasLoop: boolean;
};

export const GRAPH = {
  nodeW: 168,
  nodeH: 40,
  colGap: 56,
  rowGap: 14,
  pad: 16,
  maxNodes: 80,
} as const;

/**
 * Who invited whom, laid out left to right: the people who were not invited by
 * anybody in the read are the first column, the people they brought in the
 * second, and so on. Every person is invited at most once (`referred_id` is
 * unique), so the read is a forest and each node has one place; a loop (the
 * thing the risk functions look for) shows as a dashed link back.
 *
 * A column is the number of invitations from the root. Rows come from the
 * leaves: each leaf takes a row, an inviter sits at the middle of the people
 * they brought in, so a branch reads as a branch.
 *
 * The read is capped at `GRAPH.maxNodes` people, taken breadth first from the
 * member in focus, and the layout says how many were left out. The plain list
 * under the picture on the desk carries every invitation, so the cap only
 * limits the drawing.
 */
export function layoutReferralGraph(edges: readonly GraphEdge[], focus: string | null): GraphLayout {
  const ids = new Set<string>();
  for (const e of edges) {
    ids.add(e.referrerId);
    ids.add(e.referredId);
  }
  const total = ids.size;
  if (total === 0) {
    return { width: 0, height: 0, nodes: [], links: [], total: 0, drawn: 0, truncated: false, hasLoop: false };
  }

  /* Breadth first from the focus (or the first person) over undirected edges, to decide who is drawn. */
  const adjacent = new Map<string, string[]>();
  const add = (a: string, b: string) => {
    const list = adjacent.get(a);
    if (list) list.push(b);
    else adjacent.set(a, [b]);
  };
  for (const e of edges) {
    add(e.referrerId, e.referredId);
    add(e.referredId, e.referrerId);
  }
  const start = focus && ids.has(focus) ? focus : edges[0]!.referrerId;
  const keep: string[] = [];
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0 && keep.length < GRAPH.maxNodes) {
    const id = queue.shift()!;
    keep.push(id);
    for (const next of adjacent.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  const drawnIds = new Set(keep);
  const drawnEdges = edges.filter((e) => drawnIds.has(e.referrerId) && drawnIds.has(e.referredId));

  /* One inviter per person: the first edge that names them. */
  const inviterOf = new Map<string, GraphEdge>();
  for (const e of drawnEdges) if (!inviterOf.has(e.referredId)) inviterOf.set(e.referredId, e);
  const childrenOf = new Map<string, string[]>();
  for (const [child, e] of inviterOf) {
    const list = childrenOf.get(e.referrerId);
    if (list) list.push(child);
    else childrenOf.set(e.referrerId, [child]);
  }

  /* Roots: nobody in the drawing invited them. A pure loop has no root, so the focus (or its first member) stands in. */
  const placed = new Set<string>();
  const roots = keep.filter((id) => !inviterOf.has(id));
  const order = [...roots];
  const col = new Map<string, number>();
  const row = new Map<string, number>();
  let nextRow = 0;

  const place = (id: string, column: number): number => {
    placed.add(id);
    col.set(id, column);
    const kids = (childrenOf.get(id) ?? []).filter((k) => !placed.has(k));
    if (kids.length === 0) {
      const mine = nextRow;
      nextRow += 1;
      row.set(id, mine);
      return mine;
    }
    const rows = kids.map((k) => place(k, column + 1));
    const middle = (Math.min(...rows) + Math.max(...rows)) / 2;
    row.set(id, middle);
    return middle;
  };

  for (const id of order) if (!placed.has(id)) place(id, 0);
  /* Anyone left is inside a loop with no root: start from the focus, then whoever remains. */
  for (const id of [start, ...keep]) if (!placed.has(id)) place(id, 0);

  const colCount = Math.max(...[...col.values()]) + 1;
  const rowCount = Math.max(nextRow, 1);
  const width = GRAPH.pad * 2 + colCount * GRAPH.nodeW + (colCount - 1) * GRAPH.colGap;
  const height = GRAPH.pad * 2 + rowCount * GRAPH.nodeH + (rowCount - 1) * GRAPH.rowGap;

  const nodes: GraphNode[] = keep.map((id) => {
    const c = col.get(id) ?? 0;
    const r = row.get(id) ?? 0;
    const e = inviterOf.get(id);
    return {
      id,
      col: c,
      x: GRAPH.pad + c * (GRAPH.nodeW + GRAPH.colGap),
      y: GRAPH.pad + r * (GRAPH.nodeH + GRAPH.rowGap),
      focus: id === focus,
      risk: e ? e.riskScore : null,
      status: e ? e.status : null,
    };
  });
  const at = new Map(nodes.map((n) => [n.id, n]));

  const links: GraphLink[] = [];
  let hasLoop = false;
  /* The lane under the last row where loop lines run, a step lower for each. */
  const innerBottom = height - GRAPH.pad;
  let lanes = 0;
  for (const e of drawnEdges) {
    const a = at.get(e.referrerId)!;
    const b = at.get(e.referredId)!;
    const isTree = inviterOf.get(e.referredId) === e && (col.get(e.referredId) ?? 0) === (col.get(e.referrerId) ?? 0) + 1;
    const y1 = a.y + GRAPH.nodeH / 2;
    const y2 = b.y + GRAPH.nodeH / 2;
    if (isTree) {
      const x1 = a.x + GRAPH.nodeW;
      const x2 = b.x;
      const mid = (x1 + x2) / 2;
      links.push({ from: a.id, to: b.id, kind: "tree", path: `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}` });
      continue;
    }
    /* A loop line leaves the inviter's right edge, drops to a lane under the whole picture and comes back up
       into the invited person: along the left gutter when they are in the first column, from below otherwise. */
    hasLoop = true;
    const lane = innerBottom + 10 + lanes * 6;
    const out = a.x + GRAPH.nodeW + 8 + Math.min(lanes, 2) * 3;
    const into =
      b.col === 0
        ? `H${4 + Math.min(lanes, 3) * 3} V${y2} H${b.x}`
        : `H${b.x + GRAPH.nodeW / 2} V${b.y + GRAPH.nodeH}`;
    lanes += 1;
    links.push({ from: a.id, to: b.id, kind: "back", path: `M${a.x + GRAPH.nodeW} ${y1} H${out} V${lane} ${into}` });
  }

  const extra = lanes > 0 ? 10 + lanes * 6 : 0;
  return {
    width,
    height: height + extra,
    nodes,
    links,
    total,
    drawn: keep.length,
    truncated: keep.length < total,
    hasLoop,
  };
}
