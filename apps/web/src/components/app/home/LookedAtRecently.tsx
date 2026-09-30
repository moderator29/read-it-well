"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { drawnSrcIn, handOff } from "@/lib/listings/handoff";
import {
  clearRecentListings,
  recentListingsServerSnapshot,
  recentListingsSnapshot,
  subscribeRecent,
  type RecentListing,
} from "@/lib/search/memory";

/**
 * "LOOKED AT RECENTLY" (recommendation B2, 30 September 2026).
 *
 * The phone already remembers the last eight listings opened
 * (`rememberListing`, written by `RecordVisit` on the listing page). This row
 * reads them back on Home, under the hero band, as small cards: the photo,
 * the title, the place and the price line the listing's own card printed.
 * It sits beside "Up next" and does not replace it.
 *
 * Hidden when empty, on the server and on a phone that has opened nothing.
 * Device only; forgotten on sign-out (`ForgetOnSignOut`). An example listing
 * keeps its Example mark. An older entry with no photo or price still shows,
 * with a plain plate and no price line, never a made-up one.
 *
 * A tap hands the card's facts to the listing's loading shell (B4), so the
 * listing opens in one frame from here too.
 */
export function LookedAtRecently({
  copy,
}: {
  copy: { title: string; clear: string; clearLabel: string; example: string; verified: string };
}) {
  const entries = useSyncExternalStore(subscribeRecent, recentListingsSnapshot, recentListingsServerSnapshot);
  if (entries.length === 0) return null;
  return (
    <section className="nf-lookback mt-group" aria-labelledby="lookback-title" data-testid="looked-at-recently">
      <div className="nf-lookback__head">
        <h2 id="lookback-title" className="nf-section-label">
          {copy.title}
        </h2>
        <button type="button" className="nf-recent__clear" aria-label={copy.clearLabel} onClick={clearRecentListings}>
          {copy.clear}
        </button>
      </div>
      <ul className="nf-lookback__track nf-scroll-x">
        {entries.map((entry) => (
          <li key={entry.id} className="contents">
            <LookbackCard entry={entry} copy={copy} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function LookbackCard({ entry, copy }: { entry: RecentListing; copy: { example: string; verified: string } }) {
  return (
    <Link
      href={`/listing/${entry.id}`}
      className="nf-lookback__card"
      onClick={(event) => {
        handOff(
          {
            id: entry.id,
            title: entry.title,
            place: entry.place,
            photo: entry.photo ?? null,
            price: entry.price ?? null,
            priceNote: entry.priceNote ?? "",
            mark: entry.mark ?? null,
          },
          drawnSrcIn(event.currentTarget, entry.photo),
        );
      }}
    >
      <span className="nf-lookback__photo">
        {entry.photo ? (
          <RemoteImage src={entry.photo} alt="" width={152} height={114} sizes="152px" loading="lazy" />
        ) : null}
        {entry.mark === "example" ? (
          <span className="nf-badge nf-badge--example">{copy.example}</span>
        ) : entry.mark === "verified" ? (
          <span className="nf-badge nf-badge--verified">{copy.verified}</span>
        ) : null}
      </span>
      <span className="nf-lookback__title">{entry.title}</span>
      {entry.place ? <span className="nf-lookback__place">{entry.place}</span> : null}
      {entry.price ? (
        <span className="nf-lookback__price">
          {entry.price}
          {entry.priceNote ? <span className="nf-lookback__note"> {entry.priceNote}</span> : null}
        </span>
      ) : null}
    </Link>
  );
}
