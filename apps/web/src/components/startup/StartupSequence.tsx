import "./startup.css";
import { STARTUP_SCRIPT } from "./startup-script";

/**
 * The brand art the opening draws: the real glass mark and the chrome
 * wordmark, both made for a dark ground, recompressed to twice their display
 * size (`public/brand/startup/`, from `vallo-mark.png` and
 * `vallo-wordmark.png`). The mark's file is also the sweep's mask
 * (`startup.css`), and the root layout preloads both.
 */
export const STARTUP_MARK = { src: "/brand/startup/vallo-mark.webp", width: 280, height: 268 } as const;
export const STARTUP_WORDMARK = { src: "/brand/startup/vallo-wordmark.webp", width: 312, height: 69 } as const;

/**
 * THE APP OPENING: THE REAL MARK, THEN THE PRODUCT (directive D31,
 * MOTION_SYSTEM.md section 3).
 *
 * October 2026: the founder rejected the flat vector redraw of the logo this
 * used to assemble facet by facet ("remove those vector"). The opening now
 * draws the brand's own art, the glossy glass mark and the chrome wordmark,
 * as plain images, and moves them with transform and opacity only:
 *
 *     0      60   the bare navy ground, exactly the native splash
 *     0     900   a soft glow blooms behind the mark (opacity, scale)
 *     60    760   the mark rises into place: 24px low, 0.86 scale and
 *                 transparent, to rest (700ms, land)
 *     180   680   the wordmark follows, 120ms behind: 12px low to rest
 *                 (500ms, land)
 *     560  1460   one light sweep across the glass, masked to the mark's
 *                 own shape (900ms, glide)
 *     1350 1750   the door: the whole overlay fades and lifts, 1 to 1.04
 *                 (400ms, leave), and the page comes forward beneath it
 *
 * The door's 1350 is the stylesheet's (`--nf-startup-door`), so it is on
 * time on a busy phone; the script only moves it for a tap or a key, and on
 * the native shell holds every beat at its first frame until the native
 * splash has been told to go (`startup-script.ts`).
 *
 * Decorative and `aria-hidden`, so the images carry empty alt text. They are
 * plain `<img>`s with their own sizes, eager and decoded synchronously, so
 * the mark is the first thing painted once it has arrived and never pops in
 * half-decoded. A tap anywhere or the first key opens the door at once (the
 * tap's own click is eaten, so it cannot land on what the door reveals).
 */
export function StartupSequence({ nonce }: { nonce?: string | undefined }) {
  return (
    <>
      {/* `nf-splash` keeps the Track M splash's contract with the gate script
          and with `ThresholdStage`; everything it draws is `nf-startup`. */}
      <div className="nf-splash nf-startup" aria-hidden="true">
        <div className="nf-startup__lockup">
          <div className="nf-startup__glow" />
          <div className="nf-startup__mark">
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size brand image painted before hydration; next/image adds nothing here */}
            <img
              className="nf-startup__mark-img"
              src={STARTUP_MARK.src}
              width={STARTUP_MARK.width}
              height={STARTUP_MARK.height}
              alt=""
              decoding="sync"
              loading="eager"
              fetchPriority="high"
              draggable={false}
            />
            <span className="nf-startup__shine" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- as above */}
          <img
            className="nf-startup__word"
            src={STARTUP_WORDMARK.src}
            width={STARTUP_WORDMARK.width}
            height={STARTUP_WORDMARK.height}
            alt=""
            decoding="sync"
            loading="eager"
            draggable={false}
          />
        </div>
      </div>
      <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: STARTUP_SCRIPT }} />
    </>
  );
}
