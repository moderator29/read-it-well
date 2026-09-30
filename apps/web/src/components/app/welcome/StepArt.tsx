import Image from "next/image";
import type { CSSProperties } from "react";
import { WelcomeCoin } from "./WelcomeScene";

/**
 * THE PIECES A FULL-PAGE STEP IS DRAWN FROM (30 September), shared by the
 * steps (`FirstRun.tsx`) and the cold-start intro (`app/welcome/
 * WelcomeIntro.tsx`) so the two read as one place. Every visual rule is in
 * `app/welcome/welcome.css`. Server-safe: nothing here holds state.
 */

/** A glass object from `public/brand/glass`, placed in the art. */
export type Satellite = { src: string; at: "tl" | "tr" | "bl" | "br" };

export type Art = {
  /** The big object, or the turning coin. */
  hero: { kind: "image"; src: string } | { kind: "coin" };
  satellites: Satellite[];
  /** Two small glass tags floating in the sky, decorative. */
  tags?: [string] | [string, string];
  /** Which light the sky carries (welcome.css `data-sky`). */
  sky: "dawn" | "noon" | "dusk" | "night";
  label: string;
};

export function wordsIn(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * A line that rises in a word at a time. The words stay ordinary inline
 * spans with their spaces, so the heading reads whole to a screen reader;
 * the motion is `.nf-gs-word` in welcome.css, with Calm, Off and reduced
 * motion answered there.
 */
export function RiseWords({ text, start = 0 }: { text: string; start?: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <span key={`${i}-${word}`} className="nf-gs-word" style={{ "--nf-i": start + i } as CSSProperties}>
          {word}
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

/**
 * The mark and the wordmark, small, at the top of the art. `onCanvas` draws
 * it on the page itself (the interests question) rather than on the art, so
 * the light theme gets the artwork made for a light ground.
 */
export function Lockup({ onCanvas = false }: { onCanvas?: boolean }) {
  const pair = (day: boolean) => (
    <>
      <Image
        src={day ? "/brand/vallo-mark-light.png" : "/brand/vallo-mark.png"}
        alt=""
        width={614}
        height={587}
        sizes="28px"
        priority
        className="nf-gs-lockup__mark"
      />
      <Image
        src={day ? "/brand/vallo-wordmark-light.png" : "/brand/vallo-wordmark.png"}
        alt=""
        width={758}
        height={167}
        sizes="84px"
        priority
        className="nf-gs-lockup__word"
      />
    </>
  );
  return (
    <span className={onCanvas ? "nf-gs-lockup nf-gs-lockup--canvas" : "nf-gs-lockup"} role="img" aria-label="Vallo">
      {onCanvas ? (
        <>
          <span className="nf-gs-lockup__set nf-gs-lockup__set--night">{pair(false)}</span>
          <span className="nf-gs-lockup__set nf-gs-lockup__set--day">{pair(true)}</span>
        </>
      ) : (
        pair(false)
      )}
    </span>
  );
}

/**
 * One step's picture: the sky (its own light), soft hills, the hero object
 * standing on them and two small glass satellites, each on its own depth so
 * a drag parallaxes them apart. Decorative; the step's words carry it.
 */
export function StepArt({ art, priority }: { art: Art; priority: boolean }) {
  return (
    <>
      <span className="nf-gs-sky" />
      <span className="nf-gs-hills" />
      <span className="nf-gs-hero">
        <span className="nf-gs-hero__float">
          {art.hero.kind === "coin" ? (
            /* The coin's glass is drawn for the night; it keeps it in both
               themes, like the rest of the art. */
            <span className="nf-gs-hero__coin" data-theme="dark">
              <WelcomeCoin />
            </span>
          ) : (
            <Image
              src={art.hero.src}
              alt=""
              width={557}
              height={470}
              sizes="(min-width: 64rem) 38vw, (min-width: 40rem) 460px, 84vw"
              priority={priority}
              className="nf-gs-hero__img"
            />
          )}
        </span>
      </span>
      {art.satellites.map((s) => (
        <span key={s.src} className={`nf-gs-sat nf-gs-sat--${s.at}`}>
          <span className="nf-gs-sat__float">
            <Image src={s.src} alt="" width={256} height={256} sizes="120px" />
          </span>
        </span>
      ))}
      {art.tags?.map((tag, i) => (
        <span key={tag} className={i === 0 ? "nf-gs-tag nf-gs-tag--a" : "nf-gs-tag nf-gs-tag--b"}>
          {tag}
        </span>
      ))}
    </>
  );
}
