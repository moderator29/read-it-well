"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Segmented } from "@/components/ui/Segmented";
import type { Dictionary } from "@vallo/i18n/core";
import type { ScenesCopy } from "./welcome-copy";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { ObjectArt } from "@/components/auth/ObjectArt";

/**
 * THE FOUR PAGES OF THE TOUR, AS PICTURES (W11, 6 October 2026; north star
 * 14.6, reference 36 and the founder's onboarding sheets).
 *
 * ONE IDEA PER PAGE, AND THE IDEA IS AN OBJECT. Where the tour of 30 September
 * put the founder's clay art in a rounded card with chips floating over it
 * (and a fifth of the screen was card edge), each page here is a hero object
 * on the night itself, large, with at most two small pieces of real product
 * beside it. The objects are the accepted two-tier set (D29): the two hero
 * SCENES (`scene-house-keys` and `scene-hotel-bell`, the real places of Tier A)
 * for the two worlds, and matte Tier B symbols for the three ideas (a shield
 * for verified, a pair of speech bubbles for talk first, an open door for
 * moving in).
 *
 *   1  two worlds      the home and the hotel, one in front at a time, with a
 *                      sliding pill that brings the other forward. The only
 *                      interactive piece in the tour, and it is a real choice
 *                      between two real halves of the product.
 *   2  verified        a shield with its tick, and the two words the product
 *                      stands behind: Verified, and the Vallo Record.
 *   3  talk and pay    a conversation, then Pay on Vallo.
 *   4  move in         an open door and its key, and what a move-in total is
 *                      made of, named and not counted.
 *
 * NO PROOF BAND AND NO FIGURES (north star 14.6). Vallo has 16 accounts and no
 * published listing, so nothing here counts anything, and the sheet this was
 * drawn from shows an invented passport id, invented naira and a held-in-escrow
 * panel that no screen of ours has: none of it is copied. The one example the
 * old tour carried, a move-in total with a figure and three proportions, is
 * gone: a proportion of a number that does not exist is still an invented
 * number. The conversation is labelled Example because it is one.
 *
 * Decorative pieces are `aria-hidden`; the words that ARE content (the chips,
 * the bubbles, the switch) are real text and the switch is a real group of
 * buttons. A scene that is not on screen is `inert` (`FirstRun.tsx`), so
 * nothing in it can take focus. Styles and motion are in
 * `app/welcome/onboarding-motion.css`: transform and opacity only, nothing
 * loops, and reduced motion, Calm and Off land everything at once.
 */

type Copy = Dictionary["onboardingMotion"];

/** One arriving piece: `i` is its place in the stagger (60ms apart, at most six). */
function Pop({ i, className, children }: { i: number; className: string; children: ReactNode }) {
  return (
    <span className={`nf-om-pop ${className}`} style={{ "--nf-om-i": Math.min(i, 6) } as CSSProperties}>
      {children}
    </span>
  );
}

function Chip({ icon, title, hint, tag }: { icon: Icon3DName; title: string; hint?: string; tag?: string }) {
  return (
    <span className="nf-om-chip">
      <span className="nf-om-chip__plate">
        <Icon3D name={icon} size={32} />
      </span>
      <span className="nf-om-chip__words">
        <span className="nf-om-chip__title">
          {title}
          {tag ? <span className="nf-om-tag">{tag}</span> : null}
        </span>
        {hint ? <span className="nf-om-chip__hint">{hint}</span> : null}
      </span>
    </span>
  );
}

/** The hero: one object, large, landing on its own ground. */
function Hero({ name, priority, className = "" }: { name: Parameters<typeof ObjectArt>[0]["name"]; priority: boolean; className?: string }) {
  return (
    <span className={`nf-om-hero ${className}`} aria-hidden="true">
      <span className="nf-om-hero__ground" />
      <ObjectArt name={name} size={640} priority={priority} className="nf-om-hero__img" />
    </span>
  );
}

/* ----------------------------------------------------------------- 1 */

type World = "property" | "stays";

export function WorldsScene({ t, priority }: { t: ScenesCopy; priority: boolean }) {
  const w = t.welcomeCards.twoWorlds;
  const [world, setWorld] = useState<World>("property");
  const hint = world === "property" ? w.propertyHint : w.staysHint;
  return (
    <div className="nf-om-worlds" data-world={world}>
      <Hero name="scene-house-keys" priority={priority} className="nf-om-worlds__a" />
      <Hero name="scene-hotel-bell" priority={false} className="nf-om-worlds__b" />
      <Pop i={2} className="nf-om-worlds__control">
        {/* A real choice between the two halves of the product: the shared
            Segmented pill slides to the one that is forward (`data-world` on
            the scene trades the objects), and the line under it names what
            that half is for. */}
        <Segmented<World>
          label={w.titleA + " " + w.titleB}
          semantics="radio"
          shape="pill"
          options={[
            { value: "property", label: w.property },
            { value: "stays", label: w.stays },
          ]}
          value={world}
          onChange={setWorld}
          className="nf-om-sides"
        />
        <span key={world} className="nf-om-worlds__hint" aria-live="polite">
          {hint}
        </span>
      </Pop>
    </div>
  );
}

/* ----------------------------------------------------------------- 2 */

export function KnowScene({ copy, priority }: { copy: Copy; priority: boolean }) {
  return (
    <div className="nf-om-know">
      <Hero name="shield-tick" priority={priority} />
      <Pop i={3} className="nf-om-know__badge">
        <span className="nf-om-badge">
          <UiIcon name="check" size={16} />
          {copy.know.badge}
        </span>
      </Pop>
      <Pop i={4} className="nf-om-know__record">
        <Chip icon="id-check" title={copy.know.record} hint={copy.know.recordHint} />
      </Pop>
    </div>
  );
}

/* ----------------------------------------------------------------- 3 */

export function TalkScene({ copy, priority }: { copy: Copy; priority: boolean }) {
  return (
    <div className="nf-om-talk">
      <Hero name="chat-pair" priority={priority} className="nf-om-talk__hero" />
      <div className="nf-om-talk__thread">
        <Pop i={2} className="nf-om-bubble nf-om-bubble--in">
          <span className="nf-om-tag">{copy.example}</span>
          {copy.talk.ask}
        </Pop>
        <span className="nf-om-typing" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <Pop i={5} className="nf-om-bubble nf-om-bubble--out nf-om-pop--late">
          {copy.talk.reply}
        </Pop>
        <Pop i={6} className="nf-om-talk__pay nf-om-pop--later">
          <span className="nf-om-pay">
            <span className="nf-om-chip__plate">
              <Icon3D name="pay" size={32} />
            </span>
            <span className="nf-om-chip__words">
              <span className="nf-om-chip__title">{copy.talk.pay}</span>
              <span className="nf-om-chip__hint">{copy.talk.payHint}</span>
            </span>
          </span>
        </Pop>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- 4 */

export function MoveInScene({ t, copy, priority }: { t: ScenesCopy; copy: Copy; priority: boolean }) {
  return (
    <div className="nf-om-movein">
      <Hero name="door-open" priority={priority} className="nf-om-movein__door" />
      <Pop i={2} className="nf-om-movein__key">
        <ObjectArt name="key-cushion" size={256} className="nf-om-movein__keyimg" />
      </Pop>
      <Pop i={3} className="nf-om-movein__parts">
        {/* What a move-in total is made of, in words. No figure and no
            proportion: there is no number to show yet. */}
        <span className="nf-om-parts">
          <span className="nf-om-parts__head">{copy.moveIn.total}</span>
          <span className="nf-om-parts__row">
            <span>{copy.moveIn.rent}</span>
            <span aria-hidden="true">+</span>
            <span>{copy.moveIn.agency}</span>
            <span aria-hidden="true">+</span>
            <span>{copy.moveIn.caution}</span>
          </span>
          <span className="nf-om-parts__line">{t.welcomeCards.intro.chip}</span>
        </span>
      </Pop>
    </div>
  );
}
