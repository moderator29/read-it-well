"use client";

import { useEffect, useState } from "react";
import { formatDate, formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import { shelfName } from "@/components/app/offline/ShelfView";
import type { ShelfChange, ShelfItem } from "@/lib/offline/shelf";
import { syncShelf } from "@/lib/offline/shelf-store";

/**
 * THE SHORTLIST, COPIED TO THE PHONE, AND WHAT MOVED SINCE. V-77.
 *
 * Mounted on `/saved`, which is only ever read with signal. It hands the
 * light copies the server built to `syncShelf`, which replaces the phone's
 * shelf with the account's list and returns any figure that differs from the
 * one the phone first stored. Those are drawn as changes, with both numbers
 * and the date the phone first kept the older one: the phone recorded all
 * three, so the sentence is one it can prove. It never says "when you saved
 * it", because the save's own figure was never recorded.
 *
 * Nothing is drawn when nothing moved. The one-line note that the shortlist
 * opens without signal is shown only once the copy has actually been written.
 */
export function ShelfSync({
  owner,
  items,
  copy,
  locale,
}: {
  owner: string;
  items: ShelfItem[];
  copy: Dictionary["platform"]["shelf"];
  locale: Locale;
}) {
  const [changes, setChanges] = useState<ShelfChange[]>([]);
  const [written, setWritten] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void syncShelf(owner, items).then((found) => {
      if (cancelled) return;
      setChanges(found);
      setWritten(items.length > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [owner, items]);

  if (changes.length === 0) {
    return written ? <p className="nf-caption mb-row text-muted" data-testid="shelf-on-phone">{copy.onPhone}</p> : null;
  }

  return (
    <section className="nf-panel nf-panel--card mb-block block p-card" aria-label={copy.changesTitle} data-testid="shelf-changes">
      <p className="nf-body font-semibold text-content">{copy.changesTitle}</p>
      <ul className="mt-row space-y-row">
        {changes.map((change) => {
          const template =
            change.field === "rent" ? copy.rentChanged : change.field === "moveIn" ? copy.moveInChanged : copy.priceChanged;
          return (
            <li key={`${change.id}-${change.field}`} className="nf-body-sm text-content-2">
              {template
                .replace("{name}", shelfName(change, copy, locale))
                .replace("{date}", formatDate(new Date(change.since), locale, { day: "numeric", month: "short", timeZone: "Africa/Lagos" }))
                .replace("{was}", formatMoney(change.wasMinor, locale))
                .replace("{now}", formatMoney(change.nowMinor, locale))}
            </li>
          );
        })}
      </ul>
      <p className="nf-caption mt-row text-muted">{copy.onPhone}</p>
    </section>
  );
}

