"use client";

import { Reveal } from "@/components/site/Reveal";
import { Odometer } from "@/components/site/Odometer";

/**
 * Numbers band.
 *
 * A strip of platform figures whose digits roll into place like a mechanical
 * counter the first time the band scrolls into view. Each figure is an
 * Odometer, which carries its own accessible value and its own reduced
 * motion path, so this component is now purely layout.
 */

const STATS: { label: string; value: number; suffix: string }[] = [
  { label: "Listings", value: 17, suffix: "+" },
  { label: "Cities", value: 6, suffix: "" },
  { label: "Languages", value: 4, suffix: "" },
  { label: "Support", value: 24, suffix: "/7" },
];

export function NumbersBand() {
  return (
    <section className="nf-shell py-10 sm:py-14">
      <Reveal>
        <ul
          className="nf-card grid grid-cols-2 gap-y-5 px-4 py-6 text-center sm:py-7 lg:grid-cols-4"
        >
          {STATS.map((s) => (
            <li key={s.label}>
              <span className="nf-odometer-figure block font-[family-name:var(--nf-font-display)] text-[1.7rem] font-bold leading-none sm:text-[2.1rem]">
                <Odometer value={s.value} suffix={s.suffix} />
              </span>
              <span className="mt-1.5 block text-[0.72rem] text-[var(--nf-content-muted)] sm:text-[0.8125rem]">
                {s.label}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
