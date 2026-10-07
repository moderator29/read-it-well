import { MotionReveal } from "@/components/motion/Reveal";

/**
 * The drawn outline of Nigeria with a pin on each of its major cities. Since
 * the unified pass (UIUX item 9) it is part of the category room: the city
 * chips there are the links, and this drawing sits beside them from 64rem.
 *
 * THE PINS ARE PLACES, NOT CLAIMS. Each is a real Nigerian city that search
 * answers for, and the page says so in as many words; there are no counts
 * and nothing says how much is listed where, because this drawing cannot
 * check that.
 *
 * The outline is a simplified trace of the national border projected from
 * longitude and latitude (x = (lng - 2.5) * 40, y = (14.2 - lat) * 40), close
 * enough to be recognised and far from a survey. The pins drop in one after
 * another the first time the map is on screen, once (north star motion 19),
 * and are simply there under reduced motion; pointing at a city's chip keeps
 * its pin lit and quiets the rest (landing-rooms.css, "the map moment").
 * (Each pin used to carry a looping sonar ring; the clean pass of 29
 * September removed it with the page's other loops.)
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

/*
 * WHERE EACH NAME SITS. By default a name sits to the right of its pin; the
 * south-east is dense enough that four names printed over a neighbour's pin
 * or name at desktop (Benin City over Asaba, Uyo over Calabar, Port
 * Harcourt under both), so those four are set above, below or to the left.
 * Benin City sits 16 units above its pin, not 11, since the names grew to 16
 * units (landing-rooms.css): at 11 its first letters met the end of Lagos.
 */
const LABEL_AT: Record<string, { x: number; y: number; anchor: "start" | "middle" | "end" }> = {
  "Benin City": { x: 0, y: -16, anchor: "middle" },
  Asaba: { x: 0, y: 19, anchor: "middle" },
  Uyo: { x: 0, y: 19, anchor: "middle" },
  "Port Harcourt": { x: -9, y: 4, anchor: "end" },
};

const OUTLINE =
  BORDER.map(([lng, lat], i) => {
    const p = project(lng, lat);
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(" ") + " Z";

/**
 * The drawn map alone: the outline and a pin on each city, for the category
 * room to set beside its city chips from 64rem (UIUX item 9; the map is no
 * longer a room of its own, and a phone does not draw it). Decorative: the
 * chips beside it are the links and carry the names.
 */
export function NigeriaMapArt() {
  const pins = Object.entries(CITY_POINTS).map(([city, [lng, lat]]) => ({
    city,
    ...project(lng, lat),
  }));
  return (
    <MotionReveal className="nf-ngmap">
      <svg viewBox="0 0 490 410" className="nf-ngmap__svg" aria-hidden="true">
        <path d={OUTLINE} className="nf-ngmap__land" />
        {pins.map((p, i) => (
          <g
            key={p.city}
            className="nf-ngmap__pin"
            data-pin={p.city}
            style={{ "--pin-i": i } as React.CSSProperties}
            transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
          >
            <circle r="11" className="nf-ngmap__halo" />
            <circle r="4.5" className="nf-ngmap__dot" />
            <text
              x={LABEL_AT[p.city]?.x ?? 9}
              y={LABEL_AT[p.city]?.y ?? 4}
              textAnchor={LABEL_AT[p.city]?.anchor ?? "start"}
              className="nf-ngmap__label"
            >
              {p.city}
            </text>
          </g>
        ))}
      </svg>
    </MotionReveal>
  );
}

/** The cities, in the order the chips print them. */
export const CITIES: readonly string[] = Object.keys(CITY_POINTS);
