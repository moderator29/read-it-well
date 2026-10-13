/**
 * A6. THE FRONT-DOOR FUNNEL'S VOCABULARY. Client safe.
 *
 * The same lists as the checks on `public.funnel_events` (migration
 * `20260930084814_a6_first_party_front_door_funnel.sql`); `summary.test.ts`
 * reads that file and fails if the two drift.
 */
export const FUNNEL_STEPS = [
  "landing_view",
  "get_started",
  "signup_opened",
  "step_one_done",
  "step_two_done",
  "code_sent",
  "code_resent",
  "verified",
  "first_search",
  "first_result",
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/**
 * Steps a browser may report through `/api/funnel`. `first_search` is among
 * them because the search page is where it happens; the database stamps the
 * account from the session and keeps only the first, so a browser can at most
 * report its own first search. The rest are recorded by the server.
 */
export const BEACON_STEPS: readonly FunnelStep[] = [
  "landing_view",
  "get_started",
  "signup_opened",
  "step_one_done",
  "step_two_done",
  "first_search",
];

export const FUNNEL_DOORS = [
  "hero",
  "search",
  "category",
  "header",
  "footer",
  "check",
  "calculator",
  "guide",
  "supply",
  "close",
  "other",
] as const;
export type FunnelDoor = (typeof FUNNEL_DOORS)[number];

/** The session-only visit cookie: a random id, no expiry, gone when the browser closes. */
export const VISIT_COOKIE = "nf_visit";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isVisitId(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function isFunnelStep(value: unknown): value is FunnelStep {
  return typeof value === "string" && (FUNNEL_STEPS as readonly string[]).includes(value);
}

export function asDoor(value: unknown): FunnelDoor | null {
  return typeof value === "string" && (FUNNEL_DOORS as readonly string[]).includes(value) ? (value as FunnelDoor) : null;
}

/**
 * Which door a click came through, read from where the link sits on the
 * landing: the room's `data-chapter`, or the header and footer landmarks.
 */
export function doorFromChapter(chapter: string | null | undefined, landmark: "header" | "footer" | null): FunnelDoor {
  if (landmark) return landmark;
  switch (chapter) {
    case "hero":
      return "hero";
    case "categories":
    case "category":
    /* The four markets' stack took the categories' place on the landing
       (the Plasma pass, P7, 7 October 2026): the same kind of door. */
    case "markets":
      return "category";
    case "check":
      return "check";
    case "close":
      return "close";
    default:
      return "other";
  }
}
