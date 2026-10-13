"use client";

import { createContext, use, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@vallo/i18n/core";
import { ALL_SCOPE_KEYS, copyScopeOf, type ScopeKey, type ScopedCopy } from "./copy-scope-of";
import { useClientLocale } from "./use-client-locale";

/**
 * THE ROUTE'S WORDS FOR ITS CLIENT ISLANDS (Session 3, W13). Why it exists is
 * in `copy-scope-of.ts`: a client `getDictionary` read put the whole
 * dictionary, 398KB gzipped, in the first load of every money route.
 *
 *   server page:  <CopyScope copy={copyScopeOf(t, ["checkout", "success"])}>...</CopyScope>
 *   client island: const c = useScopedCopy("checkout");
 *
 * Scopes nest: an inner scope adds to the one around it.
 *
 * A component drawn with no scope above it (a preview harness, or a page that
 * forgot) does not break: it suspends once on a dynamic import of the
 * dictionary, which the bundler splits into a chunk no route's first load
 * carries, and reads the reader's own locale from it. That path is the slow
 * one on purpose, so a missing scope shows up as a late paint in review, not
 * as a crash in production.
 */
const Scope = createContext<Partial<ScopedCopy>>({});

export function CopyScope({ copy, children }: { copy: Partial<ScopedCopy>; children: ReactNode }) {
  const outer = useContext(Scope);
  const value = useMemo(() => ({ ...outer, ...copy }), [outer, copy]);
  return <Scope.Provider value={value}>{children}</Scope.Provider>;
}

const loaded = new Map<Locale, Promise<ScopedCopy>>();

function lazyScope(locale: Locale): Promise<ScopedCopy> {
  let pending = loaded.get(locale);
  if (!pending) {
    pending = import("@vallo/i18n").then((i18n) => copyScopeOf(i18n.getDictionary(locale), ALL_SCOPE_KEYS));
    loaded.set(locale, pending);
  }
  return pending;
}

/** One slice of the route's words. `use()` may be called conditionally; the hooks above it run every render. */
export function useScopedCopy<K extends ScopeKey>(key: K): ScopedCopy[K] {
  const scope = useContext(Scope);
  const locale = useClientLocale();
  const hit = scope[key];
  if (hit) return hit as ScopedCopy[K];
  return use(lazyScope(locale))[key];
}
