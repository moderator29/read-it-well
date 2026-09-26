"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useHydrated } from "@/components/motion/useInView";
import { isDataSaver } from "@/lib/ui/data-saver";

/**
 * A LINK WHOSE PAGE IS FETCHED WHOLE BEFORE THE TAP (Track M performance).
 *
 * Next prefetches a dynamic route only as far as its `loading.tsx` by
 * default, so a tap drew the skeleton and then waited for the page: the
 * loading the founder saw on Search. The dock's tabs are already fetched
 * whole (`MobileTabBar`'s `prefetchFull`); this is the same rule for the
 * other roads that carry most taps. It switches on after hydration, where
 * data saving can be read, and never under data saving, when nothing is
 * fetched ahead at all. Until then it is an ordinary link, so the server's
 * HTML is unchanged.
 *
 * Meant for pages that are small on the wire (Search is about 35 KB): a
 * heavy page fetched on the chance of a tap costs the reader's data.
 */
export function WholePrefetchLink(props: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const hydrated = useHydrated();
  return <Link {...props} prefetch={hydrated && !isDataSaver() ? true : null} />;
}
