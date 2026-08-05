import "server-only";

/**
 * Finding a person.
 *
 * **`/u/[handle]` answered for every handle and nothing answered for none of
 * them.** A handle was reachable only if you already knew it, which made the
 * follow graph a feature you could only use on people you had already met, and
 * it is the same criticism `SOCIAL_DESIGN.md` levelled at the follow graph it
 * originally cut. Every profile link on the platform assumed you already knew
 * the name.
 *
 * **Four ways in, because people are looked for in four ways.** A name, a
 * handle, what somebody does, or where they are. All four columns sit on
 * `social_profiles` and the last three are projected there by trigger from
 * `public.profiles`, so they are unspoofable and public: nobody can type
 * themselves an occupation or a state, which is the only reason searching by
 * either of them is worth anything.
 *
 * **`citext` is not installed**, and this is exactly where that bites. Every
 * comparison here is `ilike`, on the profile columns and on both reference
 * tables, rather than an equality that would quietly find only the people who
 * typed their name the way you did.
 *
 * **There is no block check here and there must not be.**
 * `social_profiles_select` carries `not private.blocked_with(user_id)`, so
 * anybody a block touches in either direction is already absent from every
 * answer below. A second check would be a second place for it to be wrong.
 *
 * Nothing here throws. A directory that 500s because one reference lookup was
 * slow is worse than one that is briefly short.
 */

import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import { resolveSession } from "../actions/session";

export type PersonRow = {
  userId: string;
  handle: string;
  displayLabel: string;
  avatarUrl: string;
  isAgent: boolean;
  bio: string;
  /** What they do, when they have said. Never a dash when they have not. */
  occupation: string | null;
  /** Where they are, as far as it is known. "Ikeja, Lagos", or "Lagos". */
  place: string | null;
  viewerFollows: boolean;
  isViewer: boolean;
};

export type PeopleDirectory =
  | { state: "unconfigured" }
  | {
      state: "ready";
      signedIn: boolean;
      /** What was searched for, echoed back so the page can say so. */
      query: string;
      /** Which routes actually matched, so the page can say why these people. */
      matchedOn: ("name" | "occupation" | "place")[];
      people: PersonRow[];
    };

const LIMIT = 30;
/** A reference lookup matching half the country is not a search term. */
const CODE_LIMIT = 40;

/**
 * PostgREST's `or` filter is a comma separated expression, so a comma or a
 * bracket in the search text would change its meaning rather than be matched,
 * and `%` and `_` are the same problem one level down inside `ilike`.
 */
function safePattern(raw: string): string {
  return raw
    .replace(/[%_,()\\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Reference = { code: string; name: string };

export async function findPeople(rawQuery: string): Promise<PeopleDirectory> {
  if (!isSupabaseConfigured()) return { state: "unconfigured" };

  const session = await resolveSession();
  const supabase = session.state === "signed-in" ? session.supabase : await createClient();
  const viewerId = session.state === "signed-in" ? session.user.id : null;
  const query = rawQuery.trim().slice(0, 40);
  const pattern = safePattern(query);

  const nobody = (): PeopleDirectory => ({
    state: "ready",
    signedIn: Boolean(viewerId),
    query,
    matchedOn: [],
    people: [],
  });

  try {
    /*
     * The reference lookups first, because a search for "nurse" or for "Ikeja"
     * has to become a set of codes before profiles can be filtered on it. Three
     * small reads that start at once, and every one is allowed to come back
     * empty: somebody typing a name is not typing an occupation, and nothing
     * found there is the ordinary case rather than a failure.
     */
    const [occupations, lgas, states] = pattern
      ? await Promise.all([
          supabase
            .from("occupations")
            .select("code, name")
            .ilike("name", `%${pattern}%`)
            .limit(CODE_LIMIT),
          supabase
            .from("local_governments")
            .select("code, name")
            .ilike("name", `%${pattern}%`)
            .limit(CODE_LIMIT),
          supabase
            .from("states")
            .select("code, name")
            .ilike("name", `%${pattern}%`)
            .limit(CODE_LIMIT),
        ])
      : [
          { data: [] as Reference[] },
          { data: [] as Reference[] },
          { data: [] as Reference[] },
        ];

    const occupationCodes = ((occupations.data ?? []) as Reference[]).map((r) => r.code);
    const lgaCodes = ((lgas.data ?? []) as Reference[]).map((r) => r.code);
    const stateCodes = ((states.data ?? []) as Reference[]).map((r) => r.code);

    const columns =
      "user_id, handle, display_label, avatar_path, is_agent, bio, bio_status, occupation_code, lga_code, state_code";

    let read = supabase.from("social_profiles").select(columns).limit(LIMIT);

    if (pattern) {
      /* The codes come from our own reference tables and are safe to place in
         the expression; the typed text never is, and it appears only as an
         `ilike` value that `safePattern` has already stripped of the characters
         PostgREST reads as structure. */
      const clauses = [`handle.ilike.%${pattern}%`, `display_label.ilike.%${pattern}%`];
      if (occupationCodes.length > 0) {
        clauses.push(`occupation_code.in.(${occupationCodes.join(",")})`);
      }
      if (lgaCodes.length > 0) clauses.push(`lga_code.in.(${lgaCodes.join(",")})`);
      if (stateCodes.length > 0) clauses.push(`state_code.in.(${stateCodes.join(",")})`);
      read = read.or(clauses.join(",")).order("handle");
    } else {
      /* Newest first when nothing is typed, rather than most followed. A
         leaderboard of the best connected accounts entrenches itself, and the
         people worth meeting in a neighbourhood product are the ones who have
         just arrived in it. */
      read = read.order("handle_claimed_at", { ascending: false });
    }

    const { data, error } = await read;
    if (error || !data) return nobody();

    const rows = data as {
      user_id: string;
      handle: string;
      display_label: string | null;
      avatar_path: string | null;
      is_agent: boolean;
      bio: string | null;
      bio_status: string | null;
      occupation_code: string | null;
      lga_code: string | null;
      state_code: string | null;
    }[];
    if (rows.length === 0) return nobody();

    /*
     * The labels for the rows that came back. Only the codes actually present
     * are resolved, so a page of thirty people costs three small reads however
     * large the reference tables are, and they hold 749 occupations and 774
     * local governments.
     */
    const [occLabels, lgaLabels, stateLabels] = await Promise.all([
      labelsFor(supabase, "occupations", codesIn(rows, "occupation_code")),
      labelsFor(supabase, "local_governments", codesIn(rows, "lga_code")),
      labelsFor(supabase, "states", codesIn(rows, "state_code")),
    ]);

    /* One read for the whole page rather than one per row. `follows_select` is
       public, so this is the truth rather than a guess each button has to
       hold. */
    const following = new Set<string>();
    if (viewerId) {
      const { data: mine } = await supabase
        .from("follows")
        .select("followee_id")
        .eq("follower_id", viewerId)
        .in(
          "followee_id",
          rows.map((row) => row.user_id),
        );
      for (const row of (mine ?? []) as { followee_id: string }[]) following.add(row.followee_id);
    }

    const matchedOn: ("name" | "occupation" | "place")[] = [];
    if (pattern) {
      matchedOn.push("name");
      if (occupationCodes.length > 0) matchedOn.push("occupation");
      if (lgaCodes.length > 0 || stateCodes.length > 0) matchedOn.push("place");
    }

    return {
      state: "ready",
      signedIn: Boolean(viewerId),
      query,
      matchedOn,
      people: rows.map((row) => {
        const lga = row.lga_code ? (lgaLabels.get(row.lga_code) ?? null) : null;
        const state = row.state_code ? (stateLabels.get(row.state_code) ?? null) : null;
        return {
          userId: row.user_id,
          handle: row.handle,
          displayLabel: row.display_label || `@${row.handle}`,
          avatarUrl: row.avatar_path ?? "",
          isAgent: row.is_agent,
          /* A bio the scanner is holding is shown to nobody but its author, and
             a directory is nobody's own page. */
          bio: row.bio_status === "HELD" ? "" : (row.bio ?? ""),
          occupation: row.occupation_code ? (occLabels.get(row.occupation_code) ?? null) : null,
          /* Never a fragment and never a dangling comma. Half a place is still
             worth printing; no place at all prints nothing at all. */
          place: [lga, state].filter(Boolean).join(", ") || null,
          viewerFollows: following.has(row.user_id),
          isViewer: row.user_id === viewerId,
        };
      }),
    };
  } catch {
    return nobody();
  }
}

function codesIn(
  rows: Record<string, unknown>[],
  key: "occupation_code" | "lga_code" | "state_code",
): string[] {
  return [
    ...new Set(rows.map((row) => row[key]).filter((value): value is string => Boolean(value))),
  ];
}

async function labelsFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "occupations" | "local_governments" | "states",
  codes: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (codes.length === 0) return out;
  try {
    const { data } = await supabase.from(table).select("code, name").in("code", codes);
    for (const row of (data ?? []) as Reference[]) out.set(row.code, row.name);
    return out;
  } catch {
    return out;
  }
}
