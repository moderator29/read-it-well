"use client";

import { createContext, useContext } from "react";
import type { ClientCopy } from "./client-copy-of";

/**
 * THE FEW WORDS EVERY SCREEN'S CLIENT CODE NEEDS (Track M performance,
 * 25 September 2026).
 *
 * The back button, the page header, the offline tray, the save control and
 * the in-app error screen are client components mounted on almost every
 * route, with no server parent in a position to hand them a dictionary. They
 * read their words through `useClientDictionary`, which imports all four
 * dictionaries, so every route shipped a 717 KB chunk (222 KB gzipped) for
 * the word "Back" and a handful of sentences.
 *
 * Now the root layout, which already holds the reader's dictionary, passes
 * just those words down through this context: a few kilobytes in the page,
 * in the reader's own language from the first paint (the old hook painted
 * English first and settled after hydration). What is carried is decided in
 * one place, `client-copy-of.ts`, and a test checks each reader of this
 * context against it.
 *
 * Anything that needs more than these words still takes `t` from its server
 * parent, the house pattern.
 */
const Context = createContext<ClientCopy | null>(null);

export function ClientCopyProvider({
  copy,
  children,
}: {
  copy: ClientCopy;
  children: React.ReactNode;
}) {
  return <Context.Provider value={copy}>{children}</Context.Provider>;
}

/** The words the root layout carries for client code. */
export function useClientCopy(): ClientCopy {
  const copy = useContext(Context);
  if (!copy) {
    throw new Error(
      "useClientCopy() needs <ClientCopyProvider>, which the root layout renders around every page."
    );
  }
  return copy;
}

/**
 * The same words, or null outside the provider: for small shared hooks
 * (`lib/ui/use-copy.ts`) that a component test may mount bare. A screen
 * never needs this; it is always inside the root layout's provider.
 */
export function useClientCopyOptional(): ClientCopy | null {
  return useContext(Context);
}
