"use client";

import { useRouter } from "next/navigation";
import { SlidePagination } from "@/components/ui/SlidePagination";
import "./admin-material.css";

/**
 * THE DESKTOP PAGER FOR A TABLE THAT KNOWS ITS TOTAL (COMPONENT_LIBRARY, "Slide
 * pagination").
 *
 * Payments, bookings and supply count their rows, so their pager can name every
 * page, and the sliding indicator travels between them. The page is still the
 * address (`?page=3`): choosing one navigates to it, so a page is a link, the
 * back button walks it backwards and the server reads the page itself. The
 * address is built here from the same base, parameters and parameter name the
 * numbered links use, so the two can never point at different places.
 *
 * Phones keep the numbered links (this component hides itself below 48rem).
 */
export function NumberedSlidePager({
  base,
  params,
  param,
  page,
  pages,
  words,
}: {
  base: string;
  params: Record<string, string | undefined>;
  param: string;
  page: number;
  pages: number;
  words: { label: string; previous: string; next: string; page: string };
}) {
  const router = useRouter();
  const href = (p: number) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== param) next.set(k, v);
    if (p > 1) next.set(param, String(p));
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  };
  return (
    <SlidePagination
      pageCount={pages}
      page={page}
      label={words.label}
      previousLabel={words.previous}
      nextLabel={words.next}
      pageLabel={(n) => words.page.replace("{n}", String(n))}
      onChange={(next) => router.push(href(next))}
    />
  );
}
