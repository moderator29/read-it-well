"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { CountUp } from "@/components/motion/CountUp";
import { stepPhotoPaths, type StepNumber } from "./step-photos";

/**
 * THE FOUR MOVING SCENES of Get started (30 September, references 51 to 53):
 * the founder's clay art for the step in a rounded card, with UI chips in our
 * components' style arriving over it one after another and then floating
 * gently. Styles and motion are in `app/welcome/onboarding-motion.css`
 * (transform and opacity only; reduced motion, Calm and Off land everything
 * at once, and a still background stops the float).
 *
 *   1  the platform    the home and the hotel; Homes and Stays
 *   2  know who        the shield and the ID card under a scanning frame,
 *                      the Verified agent badge and the Vallo Record
 *   3  talk and pay    one question to an agent, then an Example payment on
 *                      Vallo (display only)
 *   4  move in         the arch and the keys, an Example move-in total that
 *                      counts up
 *
 * CLEAN (the founder, 7 October): at most two pieces over each picture, so
 * the art leads and nothing competes with the headline. The Property and
 * Stays switch, the reply bubble and its typing dots, the "Inspections kept"
 * pill and the "move-in total, printed" pill went in that pass.
 *
 * TRUTHFUL. Every figure is labelled Example; every other chip is a feature
 * word the product stands behind (the tick is a person seeing the agent's
 * government ID; the Record counts what happened on Vallo). Decorative: the
 * scene is `aria-hidden` and one sentence describes it for a reader.
 */

type Copy = Dictionary["onboardingMotion"];

/** One arriving piece: `i` is its place in the stagger. */
function Pop({
  i,
  className,
  children,
  float = true,
}: {
  i: number;
  className: string;
  children: ReactNode;
  float?: boolean;
}) {
  return (
    <span className={`nf-om-pop ${className}`} style={{ "--nf-om-i": i } as CSSProperties}>
      {float ? <span className="nf-om-float">{children}</span> : children}
    </span>
  );
}

function Chip({
  icon,
  title,
  hint,
  tag,
}: {
  icon: Icon3DName;
  title: string;
  hint?: string;
  tag?: string;
}) {
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

/**
 * The step's clay art, cropped to its objects. The art is the brand-blue
 * night in both themes (as the steps have always drawn it), so one file
 * serves both and a light reader does not fetch a second copy; the light
 * files in public/brand/onboarding are the same picture until the founder's
 * light art lands (step-photos.ts).
 */
function Art({ step, priority }: { step: StepNumber; priority: boolean }) {
  return (
    <span className="nf-om-art">
      <Image
        fill
        sizes="(min-width: 64rem) 520px, (min-width: 40rem) 480px, 92vw"
        draggable={false}
        alt=""
        src={stepPhotoPaths(step).dark}
        className="nf-om-art__img"
        {...(priority ? { priority: true } : { loading: "lazy" as const })}
      />
    </span>
  );
}

export function WorldsScene({ copy, priority }: { copy: Copy; priority: boolean }) {
  return (
    <>
      <Pop i={0} className="nf-om-art-wrap" float={false}>
        <Art step={1} priority={priority} />
      </Pop>
      <Pop i={2} className="nf-om-at nf-om-at--tl">
        <Chip icon="rent" title={copy.worlds.homes} hint={copy.worlds.homesHint} />
      </Pop>
      <Pop i={3} className="nf-om-at nf-om-at--br">
        <Chip icon="hotel" title={copy.worlds.stays} hint={copy.worlds.staysHint} />
      </Pop>
    </>
  );
}

export function KnowScene({ copy, priority }: { copy: Copy; priority: boolean }) {
  return (
    <>
      <Pop i={0} className="nf-om-art-wrap" float={false}>
        <Art step={2} priority={priority} />
      </Pop>
      <Pop i={1} className="nf-om-scan" float={false}>
        <span className="nf-om-scan__frame">
          <span className="nf-om-scan__corner nf-om-scan__corner--tl" />
          <span className="nf-om-scan__corner nf-om-scan__corner--tr" />
          <span className="nf-om-scan__corner nf-om-scan__corner--bl" />
          <span className="nf-om-scan__corner nf-om-scan__corner--br" />
          <span className="nf-om-scan__line" />
        </span>
      </Pop>
      <Pop i={3} className="nf-om-at nf-om-at--tr">
        <span className="nf-om-badge">
          <UiIcon name="check" size={16} />
          {copy.know.badge}
        </span>
      </Pop>
      <Pop i={4} className="nf-om-at nf-om-at--bl">
        <Chip icon="id-check" title={copy.know.record} hint={copy.know.recordHint} />
      </Pop>
    </>
  );
}

/** The example payment on the third scene; a display figure, never a balance. */
export const EXAMPLE_PAYMENT = 450000;

export function TalkScene({ copy, priority, tag }: { copy: Copy; priority: boolean; tag: string }) {
  const amount = new Intl.NumberFormat(tag).format(EXAMPLE_PAYMENT);
  return (
    <>
      <Pop i={0} className="nf-om-art-wrap" float={false}>
        <Art step={3} priority={priority} />
      </Pop>
      <Pop i={2} className="nf-om-at nf-om-at--tl">
        <span className="nf-om-bubble nf-om-bubble--in">
          <span className="nf-om-tag">{copy.example}</span>
          {copy.talk.ask}
        </span>
      </Pop>
      <Pop i={4} className="nf-om-at nf-om-at--bc">
        <span className="nf-om-pay">
          <span className="nf-om-chip__plate">
            <Icon3D name="pay" size={32} />
          </span>
          <span className="nf-om-chip__words">
            <span className="nf-om-chip__title">{copy.talk.pay}</span>
          </span>
          <span className="nf-om-pay__amount">
            <span className="nf-om-tag">{copy.example}</span>
            <span className="nf-numeric">₦{amount}</span>
          </span>
        </span>
      </Pop>
    </>
  );
}

export const EXAMPLE_MOVE_IN_TOTAL = 2150000;

export function MoveInScene({
  copy,
  priority,
  active,
  visit,
  count,
  tag,
}: {
  copy: Copy;
  priority: boolean;
  active: boolean;
  visit: number;
  count: boolean;
  tag: string;
}) {
  const fmt = new Intl.NumberFormat(tag);
  return (
    <>
      <Pop i={0} className="nf-om-art-wrap" float={false}>
        <Art step={4} priority={priority} />
      </Pop>
      <Pop i={2} className="nf-om-at nf-om-at--keys">
        <span className="nf-om-keys">
          <Icon3D name="keys" size={72} />
        </span>
      </Pop>
      <Pop i={3} className="nf-om-at nf-om-at--total" float={false}>
        <span className="nf-om-total">
          <span className="nf-om-total__head">
            <span className="nf-om-total__label">{copy.moveIn.total}</span>
            <span className="nf-om-tag">{copy.example}</span>
          </span>
          <span className="nf-om-total__figure">
            {active && count ? (
              <CountUp key={visit} value={EXAMPLE_MOVE_IN_TOTAL} prefix="₦" tag={tag} eager />
            ) : (
              <span className="nf-numeric">₦{fmt.format(EXAMPLE_MOVE_IN_TOTAL)}</span>
            )}
          </span>
          <span className="nf-om-total__bar" aria-hidden="true">
            <span className="nf-om-total__part nf-om-total__part--a" />
            <span className="nf-om-total__part nf-om-total__part--b" />
            <span className="nf-om-total__part nf-om-total__part--c" />
          </span>
          <span className="nf-om-total__legend">
            <span className="nf-om-total__key nf-om-total__key--a">{copy.moveIn.rent}</span>
            <span className="nf-om-total__key nf-om-total__key--b">{copy.moveIn.agency}</span>
            <span className="nf-om-total__key nf-om-total__key--c">{copy.moveIn.caution}</span>
          </span>
        </span>
      </Pop>
    </>
  );
}
