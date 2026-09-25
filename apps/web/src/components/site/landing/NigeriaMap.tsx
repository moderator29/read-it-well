import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { LoopGate } from "@/components/motion/LoopGate";
import { MotionReveal } from "@/components/motion/Reveal";
import { SectionHead } from "./SectionHead";

/**
 * "Where Vallo lives" (Track M, second pass): a drawn outline of Nigeria with
 * a glowing pin on each of its major cities.
 *
 * THE PINS ARE PLACES, NOT CLAIMS. Each is a real Nigerian city that search
 * answers for, and the page says so in as many words; there are no counts
 * and nothing says how much is listed where, because this drawing cannot
 * check that.
 *
 * The outline is a simplified trace of the national border projected from
 * longitude and latitude (x = (lng - 2.5) * 40, y = (14.2 - lat) * 40), close
 * enough to be recognised and far from a survey. The pins pop in one after
 * another the first time the map is on screen, and each carries a slow sonar
 * ring that runs only while visible; both are still under reduced motion.
 */
const K = 40;
const project = (lng: number, lat: number) => ({
  x: (lng - 2.5) * K,
  y: (14.2 - lat) * K,
});

const BORDER: [number, number][] = [
  [4.1, 13.5],
  [5.3, 13.8],
  [6.4, 13.6],
  [7.8, 13.3],
  [9.0, 12.8],
  [10.1, 13.2],
  [11.5, 13.4],
  [12.4, 13.1],
  [13.3, 13.7],
  [14.0, 13.1],
  [14.2, 12.4],
  [14.6, 12.1],
  [14.2, 11.2],
  [13.7, 10.8],
  [13.3, 10.1],
  [13.2, 9.5],
  [12.8, 8.7],
  [12.3, 8.4],
  [11.8, 7.5],
  [11.1, 6.8],
  [10.6, 7.0],
  [10.2, 6.9],
  [9.8, 6.5],
  [9.4, 6.0],
  [8.9, 5.6],
  [8.6, 4.8],
  [8.3, 4.6],
  [7.5, 4.4],
  [6.9, 4.3],
  [6.1, 4.3],
  [5.6, 4.6],
  [5.2, 5.3],
  [4.8, 6.2],
  [4.4, 6.4],
  [3.4, 6.4],
  [2.7, 6.4],
  [2.7, 7.0],
  [2.7, 7.9],
  [2.8, 9.1],
  [3.1, 9.4],
  [3.6, 10.3],
  [3.6, 11.0],
  [3.7, 11.7],
  [3.6, 12.5],
];

export const CITY_POINTS: Record<string, [number, number]> = {
  Lagos: [3.38, 6.52],
  Ibadan: [3.9, 7.38],
  Abuja: [7.4, 9.08],
  "Port Harcourt": [7.0, 4.82],
  Enugu: [7.51, 6.46],
  Kano: [8.52, 12.0],
  Kaduna: [7.44, 10.52],
  "Benin City": [5.62, 6.34],
  Calabar: [8.34, 4.98],
  Uyo: [7.93, 5.04],
  Owerri: [7.03, 5.48],
  Jos: [8.89, 9.9],
  Asaba: [6.73, 6.2],
};

const OUTLINE =
  BORDER.map(([lng, lat], i) => {
    const p = project(lng, lat);
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(" ") + " Z";

export function NigeriaMap({ t }: { t: Dictionary }) {
  const m = t.landingRooms.map;
  const pins = Object.entries(CITY_POINTS).map(([city, [lng, lat]]) => ({
    city,
    ...project(lng, lat),
  }));
  return (
    <section
      className="nf-shell nf-room"
      data-chapter="map"
      aria-labelledby="nf-landing-map-title"
    >
      <div className="nf-map-room">
        <SectionHead
          id="nf-landing-map-title"
          eyebrow={m.overline}
          title={m.title}
          lede={m.body}
        >
          <ul className="nf-map-room__list">
            {pins.map((p) => (
              <li key={p.city}>
                <Link
                  href={`/search?q=${encodeURIComponent(p.city)}`}
                  prefetch={false}
                  className="nf-marquee__chip nf-m-press"
                >
                  {p.city}
                </Link>
              </li>
            ))}
          </ul>
        </SectionHead>
        <MotionReveal className="nf-ngmap">
          <LoopGate>
            <svg
              viewBox="0 0 490 410"
              className="nf-ngmap__svg"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="nf-ngmap-glow">
                  <stop
                    offset="0%"
                    stopColor="currentColor"
                    stopOpacity="0.5"
                  />
                  <stop
                    offset="100%"
                    stopColor="currentColor"
                    stopOpacity="0"
                  />
                </radialGradient>
              </defs>
              <path d={OUTLINE} className="nf-ngmap__land" />
              {pins.map((p, i) => (
                <g
                  key={p.city}
                  className="nf-ngmap__pin"
                  style={{ "--pin-i": i } as React.CSSProperties}
                  transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
                >
                  <circle
                    r="18"
                    className="nf-ngmap__halo"
                    fill="url(#nf-ngmap-glow)"
                  />
                  <circle r="6" className="nf-ngmap__sonar" />
                  <circle r="4.5" className="nf-ngmap__dot" />
                  <text x="9" y="4" className="nf-ngmap__label">
                    {p.city}
                  </text>
                </g>
              ))}
            </svg>
          </LoopGate>
        </MotionReveal>
      </div>
    </section>
  );
}
