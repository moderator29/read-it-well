import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Words } from "@/components/site/Words";
import { gatedHref } from "@/lib/site/gated-href";

/**
 * Popular destinations.
 *
 * Six city cards, each a glass card with the location object, the city name and
 * a one line feel for the place, linking straight into search for that city.
 * Phones get a snap scrolling row so the band stays one thumb high; from sm up
 * the row relaxes into a grid. No counts are shown because none exist yet.
 */

const DESTINATIONS: { city: string; vibe: string }[] = [
  { city: "Lagos", vibe: "The city that never slows down." },
  { city: "Abuja", vibe: "Green, calm and capital cool." },
  { city: "Port Harcourt", vibe: "Garden city energy on the water." },
  { city: "Ibadan", vibe: "Ancient roofs and an easy pace." },
  { city: "Enugu", vibe: "Rolling hills and coal city charm." },
  { city: "Calabar", vibe: "Carnival spirit, coastal calm." },
];

export function PopularDestinations({ t }: { t: Dictionary }) {
  return (
    <section className="nf-shell py-10 sm:py-14">
      <Reveal className="mb-6 max-w-[52ch] sm:mb-8">
        <span className="nf-overline">{t.landing.hero.popularLabel}</span>
        <h2 className="nf-h1 mt-3">
          <Words text="Popular destinations" accentFrom={1} />
        </h2>
        <p className="mt-3 text-[var(--nf-content-secondary)]">
          Six cities to start with. Search reaches every state.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <ul className="nf-snap-x -mx-5 gap-4 px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 sm:pb-0 lg:grid-cols-3">
          {DESTINATIONS.map((d) => (
            <li key={d.city} className="w-[16.5rem] sm:w-auto">
              <Link
                href={gatedHref(`/search?q=${encodeURIComponent(d.city)}`)}
                className="nf-glass nf-card--interactive flex h-full items-center gap-3.5 rounded-[var(--nf-radius-lg)] p-4 sm:p-5"
              >
                <span className="h-16 w-16 shrink-0 sm:h-12 sm:w-12">
                  <BrandIcon name="pin-map" fill />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)] sm:text-[1rem]">
                    {d.city}
                  </span>
                  <span className="block text-[0.8125rem] text-[var(--nf-content-muted)]">
                    {d.vibe}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
