import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { LoopGate } from "@/components/motion/LoopGate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { SectionHead } from "./SectionHead";

/**
 * The cities marquee (Track M, second pass): two slow rows of real Nigerian
 * cities and areas, moving in opposite directions, each chip a search.
 *
 * Place names only, never counts: a count here would be a claim about the
 * catalogue that this row cannot check. Each row is its list twice, the
 * second copy hidden from assistive tech and the keyboard, and it slides by
 * exactly one copy so the loop has no seam. It runs only while on screen
 * (LoopGate), pauses under the pointer, fades at both edges, and under
 * reduced motion or data saver it stops and wraps into a still list.
 */
const ROW_A = ["Lekki", "Ikoyi", "Victoria Island", "Yaba", "Ikeja", "Surulere", "Ajah", "Gbagada", "Magodo", "Maitama", "Wuse", "Gwarinpa"];
const ROW_B = ["Port Harcourt", "Ibadan", "Enugu", "Kano", "Kaduna", "Benin City", "Calabar", "Uyo", "Owerri", "Abeokuta", "Asaba", "Jos"];

export function CitiesMarquee({ t }: { t: Dictionary }) {
  const c = t.landingRooms.cities;
  return (
    <section className="nf-room nf-room--tight" data-chapter="cities" aria-labelledby="nf-landing-cities-title">
      <div className="nf-shell">
        <SectionHead id="nf-landing-cities-title" eyebrow={c.overline} title={c.title} align="center" />
      </div>
      <LoopGate className="nf-marquee">
        {[ROW_A, ROW_B].map((row, r) => (
          <div key={r} className={`nf-marquee__row nf-marquee__row--${r === 0 ? "left" : "right"}`}>
            <ul className="nf-marquee__track">
              {[...row, ...row].map((name, i) => {
                const copy = i >= row.length;
                return (
                  <li key={`${name}-${i}`} aria-hidden={copy || undefined} className={copy ? "nf-marquee__copy" : undefined}>
                    <Link
                      href={`/search?q=${encodeURIComponent(name)}`}
                      prefetch={false}
                      tabIndex={copy ? -1 : undefined}
                      className="nf-marquee__chip nf-m-press"
                    >
                      <UiIcon name="location" size={16} aria-hidden />
                      {name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </LoopGate>
    </section>
  );
}
