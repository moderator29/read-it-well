"use server";

import { fail, ok, type ActionResult } from "../actions/envelope";
import { isSocialEnabled } from "./flag";
import { findPeople } from "./people-queries";

/**
 * The live "find people by @username" box (9 October 2026): the first few
 * matches for what has been typed so far, as light rows the box can draw as
 * a dropdown. The full list, with Follow on every row, is `/u?q=`.
 *
 * It is the same read as that page (`findPeople`), so it hides exactly the
 * people the page hides: anybody a block touches, and the facts a member did
 * not publish. Fewer than two characters answers nothing rather than listing
 * everybody on every keystroke.
 */
export type PersonHit = {
  handle: string;
  displayLabel: string;
  avatarUrl: string;
  isAgent: boolean;
  isViewer: boolean;
};

const MAX_HITS = 6;

export async function searchPeople(query: string): Promise<ActionResult<{ query: string; hits: PersonHit[] }>> {
  const typed = typeof query === "string" ? query.trim().replace(/^@+/, "").slice(0, 40) : "";
  if (typed.length < 2) return ok({ query: typed, hits: [] });
  if (!(await isSocialEnabled())) return fail("People search is paused for now. Try again in a little while.");
  const view = await findPeople(typed);
  if (view.state !== "ready") return fail("We could not search just now. Try again in a moment.");
  return ok({
    query: typed,
    hits: view.people.slice(0, MAX_HITS).map((p) => ({
      handle: p.handle,
      displayLabel: p.displayLabel,
      avatarUrl: p.avatarUrl,
      isAgent: p.isAgent,
      isViewer: p.isViewer,
    })),
  });
}
