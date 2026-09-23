"use client";

import { useEffect, useState } from "react";
import { formatDate, type Dictionary, type Locale } from "@vallo/i18n";
import { GateHandshake } from "@/components/app/inspections/GateHandshake";
import type { InspectionPack } from "@/lib/offline/pack";
import { readPacks } from "@/lib/offline/pack-store";

/**
 * THE GATE, WHEN THERE IS NO SIGNAL AT ALL. V-35.
 *
 * With no network, every navigation lands on this precached page. So the
 * inspection packs this phone holds are drawn here, read from IndexedDB,
 * each with its working gate code: the renter standing at an estate gate in
 * a basement with no bars opens Vallo, gets the offline page, and the code is
 * on it.
 *
 * Nothing is drawn when the phone holds no pack, which is almost everybody:
 * the offline page's job for them is the reconnect message above, and a
 * section saying "no inspections" would be noise at the worst moment.
 *
 * The document itself still carries nothing personal (the service worker's
 * rule that no personal HTML is written to disk stands); the packs are read
 * on the phone, after the page has loaded.
 */
export function OfflinePacks({ copy, locale }: { copy: Dictionary["platform"]["gate"]; locale: Locale }) {
  const [packs, setPacks] = useState<InspectionPack[]>([]);

  useEffect(() => {
    let cancelled = false;
    void readPacks(Date.now()).then((found) => {
      if (!cancelled) setPacks(found);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (packs.length === 0) return null;

  return (
    <section className="mx-auto mt-section w-full max-w-lg space-y-block text-left" aria-label={copy.offlineHeading} data-testid="offline-packs">
      <h2 className="nf-h3 text-content">{copy.offlineHeading}</h2>
      {packs.map((pack) => {
        const at = new Date(pack.slotAt);
        const when = copy.offlineWhen
          .replace("{day}", formatDate(at, locale, { weekday: "long", day: "numeric", month: "short", timeZone: "Africa/Lagos" }))
          .replace("{time}", formatDate(at, locale, { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }));
        return (
          <div key={pack.inspectionId}>
            <p className="nf-body font-semibold text-content">{pack.listingTitle ?? copy.title}</p>
            <p className="nf-caption mb-row text-muted">{when}</p>
            <GateHandshake
              inspectionId={pack.inspectionId}
              listingTitle={pack.listingTitle}
              locale={locale}
              copy={copy}
              live={false}
              initialPack={pack}
            />
          </div>
        );
      })}
    </section>
  );
}
