import type { ShellDictionary } from "@/lib/i18n/shell-dictionary";
import type { Side } from "@/lib/side.constants";
import Image from "next/image";
import { Logo } from "@/design-system/brand/Logo";
import "@/app/css/side-flip.css";

/**
 * The side cover: the back face of the flip.
 *
 * A full-viewport card in the INCOMING side's world. Canvas navy, the side's
 * real 3D scene (the tier-a renders: a house with its keys, a hotel with its
 * bell; it was a flat glass glyph, raised twice, A.9), the wordmark, the
 * side's name and one line about it, an accent glow, and a still miniature of
 * the other side's shelf: three tier-a objects that stand for what lives
 * there. It is static brand, needs no data, and is
 * complete at any duration, which is the whole reason it exists: the flip
 * never races the network. Only the reveal into the real page waits, on this
 * cover's quiet shimmer if it must.
 *
 * Both marks ship in the initial HTML (the cover for the other side is
 * mounted, hidden, from the first paint of the shell), so the back face never
 * pops in mid-turn.
 *
 * `data-side` on the cover itself is what gives it the incoming side's accent:
 * `--nf-side-accent` is scoped on that attribute in the token sheet, so the
 * glow is the Stays glow before the shell has switched, without a second
 * token.
 */
const COVER: Record<Side, { mark: string; miniature: string[] }> = {
  stays: {
    mark: "/brand/tier-a/scene/scene-hotel-bell@2x.webp",
    miniature: ["serviced-block", "villa-pool", "penthouse-terrace"],
  },
  property: {
    mark: "/brand/tier-a/scene/scene-house-keys@2x.webp",
    miniature: ["small-house", "apartment-block", "land-plot"],
  },
};

export function SideCover({
  side,
  t,
  ceremony = false,
  shimmer = false,
  settled = false,
  className = "",
}: {
  side: Side;
  t: ShellDictionary;
  /** The first ever flip: the side name types in and the cover holds a beat longer. */
  ceremony?: boolean;
  /** Navigation is still pending after the turn landed: the miniature breathes once per beat. */
  shimmer?: boolean;
  /**
   * The fixed twin shown after the turn: it replays NOTHING. The entrances
   * belong to the back face, which the rotation itself reveals; the twin's
   * only job is to stand still and then fade out.
   */
  settled?: boolean;
  className?: string;
}) {
  const name = side === "stays" ? t.side.staysName : t.side.propertyName;
  const line = side === "stays" ? t.side.coverStaysLine : t.side.coverPropertyLine;
  const { mark, miniature } = COVER[side];

  return (
    <div
      className={`nf-flip-cover ${className}`.trim()}
      data-side={side}
      data-settled={settled || undefined}
      aria-hidden="true"
    >
      <div className="nf-flip-cover__glow" />
      <div className="nf-flip-cover__body">
        <div className="nf-flip-cover__mark">
          <Image src={mark} alt="" width={168} height={168} sizes="168px" priority />
        </div>
        <div className="nf-flip-cover__brand">
          <Logo size={30} wordSize={16} />
        </div>
        <p className="nf-flip-cover__name nf-display" data-ceremony={ceremony || undefined}>
          {name}
        </p>
        <p className="nf-flip-cover__line nf-body">{line}</p>
        <ul className="nf-flip-cover__miniature" data-shimmer={shimmer || undefined}>
          {miniature.map((object, index) => (
            <li key={object} style={{ "--nf-flip-mini-i": index } as React.CSSProperties}>
              <Image src={`/brand/tier-a/${object}@2x.webp`} alt="" width={44} height={44} sizes="44px" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
