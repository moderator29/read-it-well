"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { useHydrated, usePlayWhenVisible } from "@/components/motion/useInView";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MiniListing } from "@/lib/site/listing-card";
import { ListingMini } from "./ListingMini";
import { Icon3D } from "@/components/ui/Icon3D";

/**
 * The AI chat showcase (Track M): a scripted conversation in a panel.
 *
 * The user's bubble slides in, three dots type, the reply streams in word by
 * word, and two listing cards fold in under it. About nine seconds a script,
 * three scripts, four seconds' rest between them. It is the second of the two
 * loops the motion plan allows and it only runs while the panel is on screen
 * and the tab is visible; off screen the clock simply stops.
 *
 * HONEST BY CONSTRUCTION. The panel says "An example conversation" above it.
 * The replies describe what the assistant is instructed to do and promise
 * nothing else. The cards are real listings from the catalogue read the
 * landing already makes, and where fewer than two exist no card is drawn.
 * The third script has no cards at all, because the true answer to "is this
 * title good" is a lawyer, not a listing.
 *
 * The drawing is `aria-hidden` and `inert` (its cards hold links a keyboard
 * must not reach); the conversation is also printed once as plain text for a
 * screen reader. Reduced motion, and the server render before any script
 * runs, show the finished first conversation with no replay button.
 */
export type ShowcaseScript = { user: string; reply: string; cards: MiniListing[]; note?: string };

const USER_AT = 0;
const DOTS_AT = 700;
const REPLY_AT = 1900;
const WORD_MS = 55;
const CARD_GAP = 260;
const SCRIPT_MS = 9000;
const REST_MS = 4000;
const FADE_MS = 380;
const TICK = 50;
/** Far past the end of any script: the finished state. */
const DONE = SCRIPT_MS;

export function AiShowcase({
  scripts,
  locale,
  labels,
}: {
  scripts: ShowcaseScript[];
  locale: Locale;
  labels: { caption: string; replay: string; you: string; name: string; verified: string; script: string };
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  /* Reduced motion, or the motion setting at Calm or Off: the finished first
     conversation, no clock (lib/motion/gate.ts). */
  const { quiet: reduce } = useMotionGate();
  const visible = usePlayWhenVisible(ref);
  const hydrated = useHydrated();
  /* Scripts run only once the page is interactive and the reader has not
     asked for less motion. Until then the panel is the finished first
     conversation, which is also what a crawler reads. */
  const live = hydrated && !reduce;
  const [index, setIndex] = useState(0);
  const [clockT, setT] = useState(0);
  const t = live ? clockT : DONE;
  /* Bumped on every fresh start, so the thread remounts and its entrances
     play again. */
  const [run, setRun] = useState(0);

  /* The clock. It only advances while the panel is on screen in a visible
     tab, so pausing is simply not ticking. The next script is chosen here,
     outside any state updater, so a double-invoked updater cannot skip one. */
  const clock = useRef(t);
  useEffect(() => {
    clock.current = t;
  }, [t]);
  useEffect(() => {
    if (!live || !visible) return;
    const id = window.setInterval(() => {
      const next = clock.current + TICK;
      if (next < SCRIPT_MS + REST_MS) {
        setT(next);
        return;
      }
      setIndex((i) => (i + 1) % scripts.length);
      setRun((r) => r + 1);
      setT(0);
    }, TICK);
    return () => window.clearInterval(id);
  }, [live, visible, scripts.length]);

  const script = (live ? scripts[index] : scripts[0]) ?? scripts[0];
  if (!script) return null;
  const words = script.reply.split(" ");
  const replyEnd = REPLY_AT + words.length * WORD_MS;
  const shownWords = t < REPLY_AT ? 0 : Math.min(words.length, Math.floor((t - REPLY_AT) / WORD_MS) + 1);
  const typing = t >= DOTS_AT && t < REPLY_AT;
  const leaving = t >= SCRIPT_MS + REST_MS - FADE_MS;

  const replay = () => {
    setT(0);
    setRun((r) => r + 1);
  };

  return (
    <div
      className="nf-ai-show"
      ref={ref}
      data-playing={live && visible ? "true" : "false"}
      /* No script with cards (an empty catalogue): a shorter panel, so the room
         holds no empty pane. */
      data-cards={scripts.some((s) => s.cards.length === 2) ? "yes" : "none"}
    >
      <div className="nf-ai-show-bar">
        <span className="nf-ai-show-caption">{labels.caption}</span>
        {live && (
          <div className="nf-ai-show-controls">
            {scripts.map((s, i) => (
              <button
                key={s.user}
                type="button"
                className="nf-ai-show-pip"
                aria-label={`${labels.script} ${i + 1}`}
                aria-pressed={i === index}
                onClick={() => {
                  setIndex(i);
                  setT(0);
                  setRun((r) => r + 1);
                }}
              />
            ))}
            <button type="button" className="nf-ai-show-replay nf-m-press" onClick={replay}>
              <UiIcon name="history" size={16} aria-hidden />
              {labels.replay}
            </button>
          </div>
        )}
      </div>

      <div className="nf-ai-show-panel" data-leaving={leaving ? "true" : undefined} aria-hidden="true" inert>
        <div className="nf-ai-show-head">
          <span className="nf-ai-show-avatar" aria-hidden="true">
            <Icon3D name="assistant" size={32} />
          </span>
          <span className="nf-ai-show-name">{labels.name}</span>
        </div>

        <div className="nf-ai-show-thread" key={run}>
          {t >= USER_AT && (
            <div className="nf-ai-bubble nf-ai-bubble--user" data-live={live ? "true" : undefined}>
              {script.user}
            </div>
          )}
          {typing && (
            <div className="nf-ai-typing">
              <span />
              <span />
              <span />
            </div>
          )}
          {shownWords > 0 && (
            <div className="nf-ai-bubble nf-ai-bubble--bot">
              {words.slice(0, shownWords).map((w, i) => (
                <span key={`${w}-${i}`} className="nf-ai-word" data-live={live ? "true" : undefined}>
                  {w}{" "}
                </span>
              ))}
            </div>
          )}
          {script.cards.length === 2 && (
            <div className="nf-ai-cards">
              {script.cards.map((card, i) =>
                t >= replyEnd + 200 + i * CARD_GAP ? (
                  <div key={card.id} className="nf-ai-card" data-live={live ? "true" : undefined}>
                    <ListingMini listing={card} locale={locale} verifiedLabel={labels.verified} sizes="170px" />
                  </div>
                ) : (
                  <div key={card.id} className="nf-ai-card nf-ai-card--slot" />
                ),
              )}
            </div>
          )}
          {script.note && t >= replyEnd + 200 && (
            <div className="nf-ai-note" data-live={live ? "true" : undefined}>
              <UiIcon name="file-search" size={16} />
              {script.note}
            </div>
          )}
        </div>
      </div>

      {/* The conversation once, as text, for a screen reader. */}
      <div className="sr-only">
        <p>{labels.caption}</p>
        {scripts.map((s) => (
          <p key={s.user}>
            {labels.you}: {s.user} {labels.name}: {s.reply}
          </p>
        ))}
      </div>
    </div>
  );
}
