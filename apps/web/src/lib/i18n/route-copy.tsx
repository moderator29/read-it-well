import type { ReactNode } from "react";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { CopyScope } from "./copy-scope";
import { copyScopeOf, type ScopeKey } from "./copy-scope-of";

/**
 * A ROUTE'S WORDS FOR ITS CLIENT ISLANDS, IN ONE LINE (Session 3, W13).
 *
 * A server component: it resolves the reader's locale, picks the named
 * slices from the dictionary and renders them in a `<CopyScope>`, so the
 * client components below read `useScopedCopy(key)` and never import the
 * dictionary (which cost 398KB gzipped per route, measured). A segment's
 * `layout.tsx` is the usual home, so every return path of its page is
 * covered without touching the page:
 *
 *   export default function Layout({ children }: { children: ReactNode }) {
 *     return <RouteCopy keys={["checkout", "success"]}>{children}</RouteCopy>;
 *   }
 *
 * Name only what the segment's islands read: each key is a few kilobytes in
 * the page's RSC payload.
 */
export async function RouteCopy({ keys, children }: { keys: readonly ScopeKey[]; children: ReactNode }) {
  const t = getDictionary(await getLocale());
  return <CopyScope copy={copyScopeOf(t, keys)}>{children}</CopyScope>;
}
