import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { NO_CUSTODY_SENTENCE, NO_INSPECTION_FEE, PAYMENT_GATE_SENTENCE } from "@/lib/money/copy";
import { HorizontalReel, type ReelFrame } from "./HorizontalReel";
import { KineticType } from "./KineticType";
import { TruchetField } from "./TruchetField";
import { VerticalColumns } from "./VerticalColumns";

/**
 * THE CINEMA KIT'S FOUR LANDING BANDS (Track M, 25 September 2026).
 *
 * The landing's rooms carry the argument; these four carry the motion the
 * founder asked for between them, each on its own axis:
 *
 *   KineticBand   giant category words sliding apart on scroll (sideways)
 *   SystemBand    the Truchet field under one sentence about money
 *   PlacesBand    the wall of photographs drifting up and down (vertical)
 *   DayBand       a day on Vallo, told by scrolling sideways (pinned)
 *
 * Words come from the `reel` dictionary; the money sentences come from
 * lib/money/copy.ts and nowhere else. Each band carries `data-chapter` so the
 * film HUD can name it.
 */

export function KineticBand({ t }: { t: Dictionary }) {
  const c = t.landing.face.categories;
  return (
    <div className="nf-kinetic-band">
      <KineticType
        label={t.reel.kinetic.label}
        words={[c.apartments, c.houses, c.shortlets, c.hotels, t.nav.restaurants, c.land, c.commercial]}
      />
    </div>
  );
}

export function SystemBand({ t }: { t: Dictionary }) {
  const s = t.reel.system;
  return (
    <section className="nf-system" data-chapter="system" aria-labelledby="nf-cine-system-title">
      <TruchetField />
      <div className="nf-system__panel">
        <p className="nf-cine-overline">{s.overline}</p>
        <h2 id="nf-cine-system-title" className="nf-cine-title">
          {s.title}
        </h2>
        <ol className="nf-system__steps">
          {[NO_INSPECTION_FEE, PAYMENT_GATE_SENTENCE, NO_CUSTODY_SENTENCE].map((line, i) => (
            <li key={i} className="nf-system__step">
              <span className="nf-system__num" aria-hidden="true">
                {i + 1}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <p className="nf-system__note" aria-hidden="true">
          {s.note}
        </p>
      </div>
    </section>
  );
}

const WALL = [
  "villa-exterior-sunset",
  "living-room-dusk",
  "restaurant-01",
  "resort-pool-deck",
  "bedroom-01",
  "tower-entrance-dusk",
  "terrace-lounge-night",
  "villa-pool-terrace",
  "restaurant-02-lounge",
  "skyline-waterfront-dusk",
  "bedroom-02",
  "villa-exterior-gate",
  "living-room-day",
  "restaurant-03-bar",
  "villa-pool-portrait",
];

export function PlacesBand({ t }: { t: Dictionary }) {
  const p = t.reel.places;
  return (
    <section className="nf-shell nf-places" data-chapter="places" aria-labelledby="nf-cine-places-title">
      <div>
        <p className="nf-cine-overline">{p.overline}</p>
        <h2 id="nf-cine-places-title" className="nf-cine-title">
          {p.title}
        </h2>
        <p className="nf-cine-lede">{p.body}</p>
        <ButtonLink href="/search" variant="primary" size="lg" className="nf-places__cta nf-magnetic">
          {p.cta}
        </ButtonLink>
      </div>
      <VerticalColumns photos={WALL} />
    </section>
  );
}

const DAY_PHOTOS = [
  "tower-entrance-dusk",
  "living-room-day",
  "villa-exterior-gate",
  "restaurant-01",
  "living-room-dusk",
  "resort-pool-deck",
];

export function DayBand({ t }: { t: Dictionary }) {
  const d = t.reel.day;
  const frames: ReelFrame[] = d.moments.map((moment, i) => ({
    key: `${moment.time}-${i}`,
    time: moment.time,
    title: moment.title,
    /* The inspection frame's sentence is the platform's own promise, read
       from the one wording rather than restated in the dictionary. */
    body: moment.body || NO_INSPECTION_FEE,
    photo: DAY_PHOTOS[i % DAY_PHOTOS.length]!,
  }));
  return <HorizontalReel chapter="day" overline={d.overline} title={d.title} body={d.body} of={d.of} frames={frames} />;
}
