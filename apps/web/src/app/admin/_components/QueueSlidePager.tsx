"use client";

import { useRouter } from "next/navigation";
import { SlidePagination } from "@/components/ui/SlidePagination";
import { queueHref, type QueueQuery } from "./queue-href";

/**
 * THE DESKTOP PAGER: SLIDE PAGINATION OVER A CURSOR (COMPONENT_LIBRARY,
 * "Slide pagination": admin tables, audit logs; never on a phone).
 *
 * The console's queues page by offset and do not know how many rows there are:
 * a count per load would be a second query on every desk, and a console that
 * prints "page 1 of 40" it cannot stand behind is worse than one that prints
 * nothing. So the page count handed to the indicator is only what the read
 * actually knows: every page up to the one open, plus one more when this page
 * came back full (the one piece of evidence there is a next). The numbers shown
 * are therefore never more than are real, and the indicator still slides
 * between them.
 *
 * The page change is a navigation to the same address with a different
 * `offset`, exactly what the previous and next links did, so a page is still a
 * URL, the back button walks it backwards and nothing reads client state.
 *
 * Phones keep the plain previous and next links (`QueuePager`), because this
 * component hides itself below 48rem by design and a numbered row is wider
 * than a phone once a page number reaches four digits.
 */
export function QueueSlidePager({
  base,
  query,
  pageSize,
  page,
  full,
  words,
}: {
  base: string;
  query: QueueQuery;
  pageSize: number;
  /** The open page, 1-based. */
  page: number;
  /** Whether this page came back full, which is the only evidence of a next. */
  full: boolean;
  words: { label: string; previous: string; next: string; page: string };
}) {
  const router = useRouter();
  const known = page + (full ? 1 : 0);
  return (
    <SlidePagination
      pageCount={known}
      page={page}
      label={words.label}
      previousLabel={words.previous}
      nextLabel={words.next}
      pageLabel={(n) => words.page.replace("{n}", String(n))}
      onChange={(next) => {
        router.push(queueHref(base, query, { offset: next <= 1 ? undefined : (next - 1) * pageSize }));
      }}
    />
  );
}
