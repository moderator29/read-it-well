import Image from "next/image";
import { LogoMark } from "@/design-system/brand/Logo";
import type { BrandIconObject } from "@/design-system/icons/BrandIcon";

/**
 * The stage every slide stands on, to `2A49E2F7`: two glass tiles tilted
 * towards each other, a centre piece between them, all on a lit glass plinth.
 *
 * WHY `next/image` ON THE GLASS PACK AND NOT `BrandIcon`. The objects are the
 * same files `BrandIcon` draws (`public/brand/glass/<name>.png`, typed by its
 * own name list). `BrandIcon` also wraps them in `.nf-brand-icon-ground`,
 * whose daylight rules in `glass.css` key on `:root[data-theme="light"]` and
 * so still match inside this permanently dark screen (LIGHT_MODE_SURVEY 9.5,
 * items 2 and 3): a stray hairline box, and the night artwork hidden for any
 * twinned mark. Drawing the file directly keeps the object and drops the leak.
 *
 * NO LETTERING IN THE ART. The render's Stays object has "HOTEL" baked into
 * it; the pack's `stays-hotel-palms` is the same building between the same
 * palms with nothing written on it.
 *
 * THE COIN TURNS. It is two faces and a stacked edge in CSS 3D, spinning on
 * its vertical axis; `prefers-reduced-motion` holds it still at the mid-turn
 * angle the render draws. Decorative throughout: the slide's own text and
 * its `art` label carry the meaning for a reader.
 */

type Tile = { icon: BrandIconObject; label: string };

export type SceneCentre = { kind: "coin" } | { kind: "object"; icon: BrandIconObject };

function GlassObject({ name, size, priority }: { name: BrandIconObject; size: number; priority?: boolean }) {
  return (
    <Image
      src={`/brand/glass/${name}.png`}
      alt=""
      width={size}
      height={size}
      priority={priority}
      className="nf-gs-object"
      style={{ width: size, height: size }}
    />
  );
}

const COIN_EDGE_LAYERS = 7;

export function WelcomeCoin() {
  return (
    <span className="nf-gs-coin">
      <span className="nf-gs-coin__orbit nf-gs-coin__orbit--a" />
      <span className="nf-gs-coin__orbit nf-gs-coin__orbit--b" />
      <span className="nf-gs-coin__tilt">
        <span className="nf-gs-coin__spin">
          {Array.from({ length: COIN_EDGE_LAYERS }, (_, i) => (
            <span
              key={i}
              className="nf-gs-coin__edge"
              style={{ "--nf-gs-layer": i - (COIN_EDGE_LAYERS - 1) / 2 } as React.CSSProperties}
            />
          ))}
          <span className="nf-gs-coin__face nf-gs-coin__face--front">
            <LogoMark size={46} />
          </span>
          <span className="nf-gs-coin__face nf-gs-coin__face--back">
            <LogoMark size={46} />
          </span>
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
  priority,
}: {
  left: Tile;
  right: Tile;
  centre: SceneCentre;
  /** What the picture shows, for a reader. */
  label: string;
  priority?: boolean;
}) {
  return (
    <div className="nf-gs-scene" role="img" aria-label={label}>
      <div className="nf-gs-plinth" aria-hidden="true">
        <span className="nf-gs-plinth__side" />
        <span className="nf-gs-plinth__top" />
        <span className="nf-gs-plinth__ring" />
        <span className="nf-gs-plinth__pool nf-gs-plinth__pool--left" />
        <span className="nf-gs-plinth__pool nf-gs-plinth__pool--right" />
      </div>
      {[left, right].map((tile, i) => (
        <div
          key={tile.icon}
          className={`nf-gs-tile ${i === 0 ? "nf-gs-tile--left" : "nf-gs-tile--right"}`}
          aria-hidden="true"
        >
          <span className="nf-gs-tile__slab" />
          <span className="nf-gs-tile__face">
            <span className="nf-gs-tile__art" data-icon={tile.icon}>
              <GlassObject name={tile.icon} size={104} priority={priority} />
            </span>
            <span className="nf-gs-tile__label">{tile.label}</span>
          </span>
        </div>
      ))}
      <div className="nf-gs-centre" aria-hidden="true">
        {centre.kind === "coin" ? (
          <WelcomeCoin />
        ) : (
          <span className="nf-gs-medal">
            <GlassObject name={centre.icon} size={92} priority={priority} />
          </span>
        )}
      </div>
    </div>
  );
}
