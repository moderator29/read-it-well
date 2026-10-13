"use server";

import { fail, ok, type ActionResult } from "../actions/envelope";
import { isSocialEnabled } from "./flag";
import { findPeople } from "./people-queries";
import { hitsOf, type PersonHit } from "./people-hits";

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
const MAX_HITS = 6;
const PAGE_HITS = 24;

/**
 * `page` asks for the people page's longer answer (every row there carries a
 * Follow button and a badge), the dropdown's default is the first few.
 */
export async function searchPeople(
  query: string,
  page?: boolean,
): Promise<ActionResult<{ query: string; hits: PersonHit[]; signedIn: boolean }>> {
  const typed = typeof query === "string" ? query.trim().replace(/^@+/, "").slice(0, 40) : "";
  if (typed.length < 2) return ok({ query: typed, hits: [], signedIn: false });
  if (!(await isSocialEnabled())) return fail("People search is paused for now. Try again in a little while.");
  const view = await findPeople(typed);
  if (view.state !== "ready") return fail("We could not search just now. Try again in a moment.");
  return ok({ query: typed, hits: hitsOf(view.people, page === true ? PAGE_HITS : MAX_HITS), signedIn: view.signedIn });
}
