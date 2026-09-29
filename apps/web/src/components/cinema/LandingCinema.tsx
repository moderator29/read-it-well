import type { Dictionary } from "@vallo/i18n/core";
import { SectionHead } from "@/components/site/landing/SectionHead";
import { VerticalColumns } from "./VerticalColumns";

/**
 * THE CINEMA KIT'S ONE LANDING BAND (Track M, 25 September 2026; trimmed
 * 29 September).
 *
 *   PlacesBand   the wall of photographs drifting up and down (vertical)
 *
 * The kit had four bands and a film HUD. The launch pass cut the kinetic
 * words, the Truchet field and the sideways day, each of which repeated a
 * neighbouring room (LandingBody.tsx says which), and the HUD. This band
 * keeps its wall and now takes the landing's one section head, so its title
 * sits on the same type scale as every other room. It carries no button of
 * its own since the clean pass: its "Start searching" went to /search, the
 * same door as the hero's one action and the search itself. Words come from
 * the `reel` dictionary.
 */

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
    <section className="nf-shell nf-room nf-places" data-chapter="places" aria-labelledby="nf-cine-places-title">
      <SectionHead id="nf-cine-places-title" eyebrow={p.overline} title={p.title} lede={p.body} />
      <VerticalColumns photos={WALL} pauseLabel={p.pause} playLabel={p.play} />
    </section>
  );
}
