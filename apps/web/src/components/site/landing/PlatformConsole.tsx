import { StatChart } from "@/components/site/StatChart";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * The platform console preview.
 *
 * A single glass panel styled like the product's own control surfaces
 * (the tag-pill category, the count badge, the tabular figure, a line
 * riding underneath), built from the same real facts the numbers band
 * states elsewhere on this page: nothing here is a metric on its own, the
 * chart is an unlabeled ambient line rather than a claim, so what is
 * asserted stays exactly what is true.
 */

const TILES: { icon: BrandIconName; pill: string; big: string; label: string }[] = [
  { icon: "map-route", pill: "Coverage", big: "36 + FCT", label: "States reached" },
  { icon: "shield-check", pill: "Trust", big: "17+", label: "Verified listings" },
  { icon: "globe-pin", pill: "Language", big: "4", label: "Languages" },
  { icon: "bot-home", pill: "Live", big: "24/7", label: "AI support" },
];

const PULSE = [3, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15];

export function PlatformConsole() {
  return (
    <section className="nf-shell pt-4" aria-labelledby="nf-console-title">
      <div className="nf-card relative overflow-hidden p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="nf-overline" id="nf-console-title">
              The console
            </span>
            <p className="mt-1 max-w-[38ch] text-[0.9375rem] text-[var(--nf-content-secondary)]">
              The same real numbers behind every booking, wallet and message on RentMe.
            </p>
          </div>
          <span className="nf-count-badge shrink-0">{TILES.length}</span>
        </div>

        <div className="nf-panel-sunken relative mt-5 overflow-hidden">
          <StatChart
            values={PULSE}
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full opacity-70 sm:h-20"
          />
          <ul className="relative grid grid-cols-2 gap-4 lg:grid-cols-4">
            {TILES.map((tile) => (
              <li key={tile.label}>
                <span className="nf-tag-pill">{tile.pill}</span>
                <span className="nf-numeric mt-2 flex items-center gap-2 text-[1.375rem] font-bold leading-none text-[var(--nf-content-primary)] sm:text-[1.6rem]">
                  <span className="h-6 w-6 shrink-0 sm:h-7 sm:w-7">
                    <BrandIcon name={tile.icon} fill tile={false} />
                  </span>
                  {tile.big}
                </span>
                <span className="mt-1 block text-[0.75rem] text-[var(--nf-content-muted)]">
                  {tile.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
