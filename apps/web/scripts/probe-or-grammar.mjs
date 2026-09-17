/*
 * Does a search term containing a comma survive `.or()`?
 *
 * `.ilike(col, value)` hands the value to the client as a separate argument, so
 * it is encoded. `.or(filterString)` hands over a whole PostgREST filter
 * EXPRESSION, and that grammar is comma-delimited, so a comma inside an
 * interpolated value is read as the end of one condition and the start of the
 * next.
 *
 * No network: the query is built and its URL read. The builder is a thenable,
 * so it must never be awaited here.
 */
import { createClient } from "@supabase/supabase-js";

const db = createClient("https://example.supabase.co", "anon-key-not-used");

const show = (label, build) => {
  const q = build();
  const url = decodeURIComponent(String(q.url ?? q));
  console.log(`${label}\n  ${url.replace("https://example.supabase.co/rest/v1/", "")}\n`);
};

/* The fix, mirrored from `lib/admin/queue-filter.ts`. Kept as a copy here on
   purpose: this probe must fail if that function stops doing what it says, and
   importing it would make the probe agree with it by construction. */
const orSafe = (v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

for (const term of ["lagos", "lagos, ikeja", 'a "quoted" place', "x)or(id.gt.0", "back\\slash"]) {
  const like = `%${term}%`;
  show(`RAW    term ${JSON.stringify(term)}`, () =>
    db.from("stories").select("id").eq("status", "HELD").or(`headline.ilike.${like},standfirst.ilike.${like}`));
  show(`SAFE   term ${JSON.stringify(term)}`, () =>
    db.from("stories").select("id").eq("status", "HELD").or(`headline.ilike.${orSafe(like)},standfirst.ilike.${orSafe(like)}`));
}
