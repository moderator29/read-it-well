/**
 * THE SUPPORT DESK'S CLOCK, AS A PURE RULE.
 *
 * A ticket's promise (/standards: four hours for a request to pay outside
 * Vallo, a day for the rest) is about how long the MEMBER has been waiting
 * for us. The queue row measures it from when the ticket was filed, which is
 * right until somebody answers: after a reply, the member's next message
 * starts a new wait, and a wait that ended with our reply is no wait at all.
 *
 * So: the first member message after our last reply (the ticket itself counts
 * as the first member message), or null when we wrote last. Client-safe.
 */

export type ThreadStep = { role: string; at: string };

/* By instant, not by string: PostgREST trims trailing zeros from the
   fraction ("…:00+00:00" beside "…:00.5+00:00"), and a collating compare
   puts "." before "+", so two messages in the same second could swap. */
const instant = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

export function waitingSince(filedAt: string, thread: readonly ThreadStep[]): string | null {
  let since: string | null = filedAt;
  const ordered = [...thread].sort((a, b) => instant(a.at) - instant(b.at));
  for (const step of ordered) {
    if (step.role === "admin") since = null;
    else if (since === null) since = step.at;
  }
  return since;
}
