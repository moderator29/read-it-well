import type { DirectoryRead } from "@/lib/directory/read";
import { parseEntries } from "@/lib/directory/model";
import { parseRows, type Board, type LeaderRow } from "@/lib/leaderboard/model";
import type { BoardRead } from "@/lib/leaderboard/read";

/*
 * SAMPLE DATA FOR DESIGN REVIEW (D76). Every name, handle and count here is
 * invented and labelled as such on the page. The product routes read only
 * real activity through public.leaderboard and public.directory.
 */

const PLACE = { code: "LA", name: "Lagos" };

type Seed = [name: string, kind: string, score: number, prev: number | null, place: string];

const SEEDS: Record<Board, Seed[]> = {
  referrals: [
    ["Ada O.", "member", 31, 2, "Lagos"],
    ["Tunde B.", "member", 24, 1, "Lagos"],
    ["Chioma E.", "member", 19, 5, "Lagos"],
    ["Ifeoluwa A.", "member", 14, 3, "Lagos"],
    ["Emeka N.", "member", 11, null, "Lagos"],
    ["Zainab M.", "member", 9, 6, "Lagos"],
    ["Sample You", "member", 6, 9, "Lagos"],
    ["Kelechi U.", "member", 5, 7, "Lagos"],
    ["Bisi K.", "member", 3, 8, "Lagos"],
    ["Femi D.", "member", 2, null, "Lagos"],
  ],
  property: [
    ["Lekki Homes Sample", "firm", 18, 1, "Lagos"],
    ["Ada Okafor", "agent", 15, 3, "Lagos"],
    ["Tunde Bello", "landlord", 12, 2, "Lagos"],
    ["Ikoyi Lets Sample", "firm", 9, null, "Lagos"],
    ["Chioma Eze", "agent", 7, 4, "Lagos"],
    ["Sample You", "agent", 5, 8, "Lagos"],
    ["Yaba Rooms Sample", "agent", 3, 6, "Lagos"],
  ],
  hotels: [
    ["Harbour Suites Sample", "hotel", 142, 1, "Lagos"],
    ["Lekki Courts Sample", "serviced_apartments", 96, 3, "Lagos"],
    ["Ikoyi House Sample", "guest_house", 71, 2, "Lagos"],
    ["Island Shortlets Sample", "shortlet_operator", 40, null, "Lagos"],
    ["Sample You", "hotel", 22, 6, "Lagos"],
  ],
  restaurants: [
    ["Jollof House Sample", "restaurant", 64, 2, "Lagos"],
    ["Suya Yard Sample", "restaurant", 58, 1, "Lagos"],
    ["Pepper Room Sample", "restaurant", 31, null, "Lagos"],
  ],
};

function rows(board: Board, opts: { meName?: string; shuffle?: boolean }): LeaderRow[] {
  const seeds = [...SEEDS[board]];
  if (opts.shuffle) {
    /* Global reads differently from the city: a fixed reorder, never random. */
    seeds.sort((a, b) => (b[2] * 7 + b[0].length) % 41 - (a[2] * 7 + a[0].length) % 41);
  }
  const scored = seeds.map((s, i) => ({ s, score: opts.shuffle ? s[2] * 2 + ((i * 5) % 9) : s[2] }));
  scored.sort((a, b) => b.score - a.score);
  let rank = 0;
  let last = -1;
  const out = scored.map(({ s, score }, i) => {
    if (score !== last) rank = i + 1;
    last = score;
    const above = scored.filter((x) => x.score > score).map((x) => x.score);
    return {
      rank,
      previous_rank: s[3],
      kind: s[1],
      display_name: s[0],
      ref: null,
      avatar_url: null,
      place_code: "LA",
      place_name: s[4],
      verified: true,
      score,
      next_score: above.length ? Math.min(...above) : null,
      total: scored.length,
      is_me: s[0] === (opts.meName ?? "Sample You"),
    };
  });
  return parseRows(out);
}

export function fixtureBoard(board: Board, state: string, me: string | undefined): BoardRead {
  if (state === "not-live") return { state: "not-live", place: PLACE, signedIn: true };
  if (state === "empty") return { state: "ready", city: [], global: [], place: PLACE, signedIn: true };
  const meName = me === "top" ? SEEDS[board][1]?.[0] : undefined;
  return {
    state: "ready",
    city: rows(board, { meName }),
    global: rows(board, { meName, shuffle: true }),
    place: PLACE,
    signedIn: true,
  };
}

const DIR_PROPERTY = [
  { kind: "agent", display_name: "Ada Okafor (sample)", ref: null, area: "Lekki", verified: true, completed: 15, live_listings: 6 },
  { kind: "firm", display_name: "Lekki Homes Sample", ref: null, area: "Lekki Phase 1", verified: true, completed: 18, live_listings: 21 },
  { kind: "landlord", display_name: "Tunde Bello (sample)", ref: null, area: "Yaba", verified: true, completed: 4, live_listings: 2 },
  { kind: "agent", display_name: "Chioma Eze (sample)", ref: null, area: "Ikeja GRA", verified: false, completed: 0, live_listings: 3 },
  { kind: "agent", display_name: "New Agent Sample", ref: null, area: "Ajah", verified: false, completed: 0, live_listings: 0 },
];

const DIR_STAYS = [
  { kind: "hotel", display_name: "Harbour Suites Sample", ref: null, area: "Victoria Island", verified: true, completed: 142, live_listings: 4 },
  { kind: "host", display_name: "Lekki Courts Sample", ref: null, area: "Lekki", verified: true, completed: 96, live_listings: 12 },
  { kind: "shortlet", display_name: "Island Shortlets Sample", ref: null, area: "Ikoyi", verified: true, completed: 40, live_listings: 9 },
  { kind: "host", display_name: "Ikoyi House Sample", ref: null, area: "Old Ikoyi", verified: false, completed: 0, live_listings: 1 },
];

export function fixtureDirectory(side: "property" | "stays", state: string): DirectoryRead {
  if (state === "not-live") return { state: "not-live", place: PLACE };
  if (state === "empty") return { state: "ready", city: [], global: [], place: PLACE };
  const data = (side === "property" ? DIR_PROPERTY : DIR_STAYS).map((r) => ({
    ...r,
    avatar_url: null,
    place_code: "LA",
    place_name: "Lagos",
    verification_tier: r.verified ? 1 : 0,
    since: "2026-09-01",
  }));
  const entries = parseEntries(data, side);
  return { state: "ready", city: entries, global: entries, place: PLACE };
}
