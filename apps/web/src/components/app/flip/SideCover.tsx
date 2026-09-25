import type { ShellDictionary } from "@/lib/i18n/shell-dictionary";
import type { Side } from "@/lib/side.constants";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Logo } from "@/design-system/brand/Logo";

/**
 * The side cover: the back face of the flip.
 *
 * A full-viewport card in the INCOMING side's world. Canvas navy, the side's
 * glass mark, the wordmark, the side's name and one line about it, an accent
 * glow, and a still miniature of the other side's shelf: three glass objects
 * that stand for what lives there. It is static brand, needs no data, and is
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
const COVER: Record<
  Side,
  { mark: BrandIconName; miniature: BrandIconName[] }
> = {
  stays: {
    mark: "hotel",
    miniature: ["hotel", "shortlet", "serviced-apartment"],
  },
  property: {
    mark: "keys-home",
    miniature: ["keys-home", "home-check", "land-plot"],
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
          <BrandIcon name={mark} size={128} priority />
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
              <BrandIcon name={object} size={40} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
