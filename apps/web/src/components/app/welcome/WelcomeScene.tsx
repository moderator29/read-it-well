import Image from "next/image";

/**
 * THE COIN, Vallo's own turning mark (the founder, 25 September 2026).
 *
 * It stood in the middle of the old first-run stage; the full-page steps
 * (`FirstRun.tsx`, 30 September) stand it as the hero of the last step. Its
 * faces keep the governing render's coin rim and glass (`coin-face.webp`),
 * a sunk inner field covers the drawn emblem, and `vallo-mark.svg`, the same
 * artwork `LogoMark` draws, stands on it. The turn, the glow and the rim are
 * in welcome.css; `prefers-reduced-motion`, Calm and Off hold it at rest.
 *
 * Decorative: the step's own words carry the meaning.
 */
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
                src="/brand/vallo-mark.svg"
                alt=""
                width={776}
                height={664}
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
