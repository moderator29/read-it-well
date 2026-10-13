/**
 * The queue's query and the address it builds, with no server imports, so a
 * client component (the sliding pager) can build the same links the server
 * pages do. `QueueFilters.tsx` re-exports both, so every desk keeps importing
 * them from where it always has.
 */
export type QueueQuery = {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  offset?: number;
};

/** The same query as a link, with one field changed. */
export function queueHref(base: string, query: QueueQuery, over: Partial<QueueQuery>): string {
  const next = { ...query, ...over };
  const search = new URLSearchParams();
  if (next.q) search.set("q", next.q);
  if (next.status) search.set("status", next.status);
  if (next.from) search.set("from", next.from);
  if (next.to) search.set("to", next.to);
  if (next.offset && next.offset > 0) search.set("offset", String(next.offset));
  const tail = search.toString();
  /* A lane of the unified queue carries its own `?tab=` (V-88). */
  return tail.length > 0 ? `${base}${base.includes("?") ? "&" : "?"}${tail}` : base;
}

