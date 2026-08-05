/**
 * The branded frame every listing photograph is painted on.
 *
 * Extracted from `ListingGallery` so the hero, the photo grid and the lightbox
 * all fall back to the same thing: the listing's deterministic gradient with
 * the skyline silhouette the cards use. A photo that has not arrived, or a CDN
 * that cannot be reached, degrades to a branded frame rather than a broken
 * image, and it does it identically in all three places.
 *
 * The gradient pairs are photographic ground, not brand colour: they are the
 * same six pairs the gallery has always shipped, moved rather than restyled.
 */

export const PHOTO_HUES: [string, string][] = [
  ["#1E3A8A", "#172554"],
  ["#155E75", "#0F172A"],
  ["#0C4A6E", "#111827"],
  ["#334155", "#0F172A"],
  ["#1E40AF", "#1E1B4B"],
  ["#312E81", "#0F172A"],
];

/** Resolves a listing's hue index to its gradient pair. */
export function photoHue(hue: number): [string, string] {
  return PHOTO_HUES[hue % PHOTO_HUES.length] ?? PHOTO_HUES[0]!;
}

export function PhotoFrame({
  hue,
  /** Alternates the gradient angle so a run of panes does not read as one wall. */
  index = 0,
}: {
  hue: number;
  index?: number;
}) {
  const [from, to] = photoHue(hue);
  const angle = index % 2 === 0 ? 150 : 205;
  return (
    <div
      className="absolute inset-0"
      style={{ background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)` }}
    >
      <svg
        viewBox="0 0 400 300"
        className="absolute inset-0 h-full w-full opacity-70"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <path
          d="M0 300V190h34v-52h30v52h28v-84h44v84h26v-40h38v40h30v-66h40v66h34v-30h32v30h30v-46h34v46Z"
          fill="rgba(0,0,0,0.42)"
        />
        <circle cx="322" cy="62" r="26" fill="rgba(255,255,255,0.16)" />
      </svg>
    </div>
  );
}
