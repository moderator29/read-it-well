import Image from "next/image";
import type { BrandIconObject } from "@/design-system/icons/BrandIcon";

/**
 * The stage every slide stands on, cut from `2A49E2F7` itself.
 *
 * THE ART IS THE RENDER'S. The two tilted thick-glass tiles, the glowing
 * plinth with its light pillars and reflection, the coin's orbit swirl and the
 * haze behind them are one picture cropped from the governing image by
 * `scripts/design/session-b-crops.mjs` (see `public/brand/session-b/welcome/
 * SOURCES.md`), feathered at its edges so it melts into the page.
 *
 * WHAT IS LIVE OVER IT, and why each thing is not in the pixels:
 *   the labels   PROPERTY and STAYS were retouched out of the glass and are
 *                real text here, so they translate and read aloud.
 *   the coin     the drawn coin's body was retouched out and a CSS 3D coin
 *                stands exactly where it stood, and it turns. Its faces keep
 *                THIS render's coin rim and glass, un-projected from its
 *                mid-turn ellipse to a circle (`coin-face.webp`), so at rest
 *                the coin turns it back to the pose it was drawn in.
 *                `prefers-reduced-motion` holds it at that pose.
 *                THE EMBLEM IS VALLO'S OWN MARK (the founder, 25 September
 *                2026: the render's generic building "is not our real
 *                logo"). A sunk inner field covers the drawn emblem, and
 *                `vallo-mark.png`, the same artwork `LogoMark` draws, stands
 *                on it; the turn and the glow are unchanged (welcome.css).
 *   the objects  slide one carries the render's own house and hotel (the
 *                hotel's HOTEL sign retouched blank: no lettering in an
 *                object). Slides two to four use the same stage with the
 *                tiles emptied, and stand the pack's glass objects in them,
 *                turned to the tiles' angle.
 *
 * Decorative throughout: the slide's own text and the `label` below carry the
 * meaning for a reader.
 */

type Tile = { icon: BrandIconObject; label: string };

export type SceneCentre = { kind: "coin" } | { kind: "object"; icon: BrandIconObject };

/* The crop is 636 x 530 source px (SOURCES.md). */
const STAGE_W = 636;
const STAGE_H = 530;

export function WelcomeCoin() {
  return (
    <span className="nf-gs-coin">
      <span className="nf-gs-coin__tilt">
        <span className="nf-gs-coin__spin">
          {Array.from({ length: 15 }, (_, i) => (
            <span
              key={i}
              className="nf-gs-coin__edge"
              style={{ "--nf-gs-layer": i - 7 } as React.CSSProperties}
            />
          ))}
          {(["front", "back"] as const).map((side) => (
            <span key={side} className={`nf-gs-coin__face nf-gs-coin__face--${side}`}>
              <Image
                src="/brand/session-b/welcome/coin-face.webp"
                alt=""
                width={160}
                height={160}
                priority={side === "front"}
              />
              <span className="nf-gs-coin__field" />
              <Image
                src="/brand/vallo-mark.png"
                alt=""
                width={614}
                height={587}
                sizes="96px"
                priority={side === "front"}
                className="nf-gs-coin__mark"
              />
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

export function WelcomeScene({
  left,
  right,
  centre,
  label,
  renderObjects,
  priority,
}: {
  left: Tile;
  right: Tile;
  centre: SceneCentre;
  /** What the picture shows, for a reader. */
  label: string;
  /** True on slide one: the render's own house and hotel are in the art. */
  renderObjects: boolean;
  priority?: boolean;
}) {
  return (
    <div className="nf-gs-scene" role="img" aria-label={label}>
      <Image
        src={
          renderObjects
            ? "/brand/session-b/welcome/stage-worlds.webp"
            : "/brand/session-b/welcome/stage-tiles.webp"
        }
        alt=""
        width={STAGE_W}
        height={STAGE_H}
        sizes="(min-width: 48rem) 434px, 380px"
        priority={priority}
        className="nf-gs-scene__art"
      />
      {!renderObjects &&
        [left, right].map((tile, i) => (
          <span
            key={tile.icon}
            className={`nf-gs-scene__object ${i === 0 ? "nf-gs-scene__object--left" : "nf-gs-scene__object--right"}`}
            aria-hidden="true"
          >
            <Image src={`/brand/glass/${tile.icon}.png`} alt="" width={256} height={256} />
          </span>
        ))}
      <span className="nf-gs-scene__label nf-gs-scene__label--left" aria-hidden="true">
        {left.label}
      </span>
      <span className="nf-gs-scene__label nf-gs-scene__label--right" aria-hidden="true">
        {right.label}
      </span>
      <span className="nf-gs-centre" aria-hidden="true">
        {centre.kind === "coin" ? (
          <WelcomeCoin />
        ) : (
          <span className="nf-gs-medal">
            <Image src={`/brand/glass/${centre.icon}.png`} alt="" width={256} height={256} />
          </span>
        )}
      </span>
    </div>
  );
}
