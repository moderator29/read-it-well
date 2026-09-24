"use client";

import { useEffect, useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n";
import type { ShelfItem } from "@/lib/offline/shelf";
import { readShelf } from "@/lib/offline/shelf-store";
import { ShelfView } from "@/components/app/offline/ShelfView";

/**
 * THE SHORTLIST ON THE OFFLINE PAGE. V-77.
 *
 * With no signal every navigation lands here, including a tap on Saved or on
 * a saved listing, so this is where the phone's copy of the shortlist is
 * drawn. Nothing is drawn when the phone holds none, which is most people:
 * for them the page's job is the reconnect message.
 */
export function OfflineShelf({ copy, locale }: { copy: Dictionary["platform"]["shelf"]; locale: Locale }) {
  const [state, setState] = useState<{ items: ShelfItem[]; now: number }>({ items: [], now: 0 });
  useEffect(() => {
    let cancelled = false;
    void readShelf().then((items) => {
      if (!cancelled) setState({ items, now: Date.now() });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return <ShelfView items={state.items} copy={copy} locale={locale} now={state.now} />;
}
