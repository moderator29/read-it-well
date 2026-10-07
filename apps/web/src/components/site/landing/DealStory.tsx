import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { Amount } from "@/components/ui/Amount";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { photo } from "@/lib/site/photos";
import { LIVE_RAIL } from "@/lib/money/rails";
import {
  AGREEMENT_PAYMENT_OPEN_TITLE,
  NO_INSPECTION_FEE,
  PAYMENT_GATE_SENTENCE,
  RAIL_COPY,
} from "@/lib/money/copy";
import { EXAMPLE_MOVE_IN } from "./example-move-in";
import { StoryPill } from "./StoryPill";

/**
 * HOW A DEAL WORKS, AS A STACK THAT REVEALS ON SCROLL (P7, 7 October 2026).
 *
 * The founder's `stack-scroll-reveal.jpg`: full-bleed dark cards with a big
 * index that stack as you scroll, under a floating glass control pill. And
 * `store-screens-learn-create-get-paid.jpg` with the Plasma explainer: real
 * product fragments breaking out of a device frame towards the reader.
 *
 * Five cards, one per step: find, verify, agree, pay, move in. Each card is a
 * night island with its index, its step, one sentence, and on the right a
 * phone with one fragment of the product breaking out of it, the founder's
 * 3D object for the step resting on the fragment's corner.
 *
 * EVERY SENTENCE IS THE PRODUCT'S OWN. Verify, Agree and Pay print the money
 * constants (`NO_INSPECTION_FEE`, `PAYMENT_GATE_SENTENCE`, and the live
 * rail's `howItMoves`), so this story can never promise a payment flow the
 * checkout does not run. The fragments are the example flat the hero and the
 * move-in tools already use, and each says it is an example.
 *
 * THE STACK IS CSS (landing-plasma.css, "the deal story"): each card is
 * sticky a little lower than the one before, so the next card slides over
 * it; where the browser has scroll timelines the covered card sinks back
 * and dims, and the fragment breaks out of its phone as the card arrives.
 * Reduced motion, Calm, Off and data saver get the five cards as a settled
 * column: not sticky, nothing moving. The pill is the only script, and it
 * only reads which card is in view.
 */
type Step = {
  key: "find" | "verify" | "agree" | "pay" | "move";
  object: Icon3DName;
  body: string;
  fragment: ReactNode;
};

function Row({ icon, label, value, tone }: { icon: UiIconName; label: string; value?: string; tone?: "ok" }) {
  return (
    <li className="nf-pl-frag__row" data-tone={tone}>
      <UiIcon name={icon} size={16} aria-hidden />
      <span>{label}</span>
      {value ? <span className="nf-pl-frag__value">{value}</span> : null}
    </li>
  );
}

export function DealStory({ t, locale }: { t: Dictionary; locale: Locale }) {
  const s = t.experienceLanding.plasma.story;
  const f = s.frag;
  const u = t.landingRooms.stack.ui;
  const find = t.landingRooms.journey.steps.find((step) => step.key === "find");
  const rail = RAIL_COPY[LIVE_RAIL];
  const example = (
    <span className="nf-badge nf-badge--example nf-pl-frag__mark">
      <UiIcon name="info" size={12} aria-hidden />
      {u.example}
    </span>
  );

  const steps: Step[] = [
    {
      key: "find",
      object: "search",
      body: find && "body" in find ? (find.body ?? "") : "",
      fragment: (
        <>
          <div className="nf-pl-frag__photo">
            <Image src={photo("villa-exterior-gate")} alt="" fill sizes="18rem" />
            {example}
          </div>
          <p className="nf-pl-frag__title">{u.listingTitle}</p>
          <p className="nf-pl-frag__muted">
            <UiIcon name="location" size={12} aria-hidden />
            {u.place}
          </p>
          <p className="nf-pl-frag__label">{u.moveIn}</p>
          <p className="nf-pl-frag__figure">
            <Amount minorUnits={EXAMPLE_MOVE_IN.total} locale={locale} currency="NGN" className="nf-numeric" />
          </p>
        </>
      ),
    },
    {
      key: "verify",
      object: "id-check",
      body: NO_INSPECTION_FEE,
      fragment: (
        <>
          <div className="nf-pl-frag__head">
            <span className="nf-pl-frag__plate" aria-hidden="true">
              <UiIcon name="calendar-check" size={20} />
            </span>
            <p className="nf-pl-frag__title">{f.inspection}</p>
            {example}
          </div>
          <ul className="nf-pl-frag__rows">
            <Row icon="user-check" label={f.reviewed} tone="ok" />
            <Row icon="price-tag" label={f.noFee} tone="ok" />
            <Row icon="phone" label={f.gate} tone="ok" />
          </ul>
        </>
      ),
    },
    {
      key: "agree",
      object: "contract",
      body: PAYMENT_GATE_SENTENCE,
      fragment: (
        <>
          <div className="nf-pl-frag__head">
            <span className="nf-pl-frag__plate" aria-hidden="true">
              <UiIcon name="document" size={20} />
            </span>
            <p className="nf-pl-frag__title">{f.agreement}</p>
            {example}
          </div>
          <ul className="nf-pl-frag__rows">
            <Row icon="user" label={f.you} value={f.confirmed} tone="ok" />
            <Row icon="user" label={f.owner} value={f.confirmed} tone="ok" />
            <Row icon="shield-check" label={f.vallo} value={f.approved} tone="ok" />
          </ul>
          <p className="nf-pl-frag__open">
            <UiIcon name="circle-check" size={16} aria-hidden />
            {AGREEMENT_PAYMENT_OPEN_TITLE}
          </p>
        </>
      ),
    },
    {
      key: "pay",
      object: "card-secure",
      body: rail.howItMoves,
      fragment: (
        <>
          <div className="nf-pl-frag__head">
            <p className="nf-pl-frag__label">{f.youPaid}</p>
            {example}
          </div>
          <p className="nf-pl-frag__figure nf-pl-frag__figure--hero">
            <Amount minorUnits={EXAMPLE_MOVE_IN.total} locale={locale} currency="NGN" className="nf-numeric" />
          </p>
          <p className="nf-pl-frag__muted">{rail.releaseCondition}</p>
        </>
      ),
    },
    {
      key: "move",
      object: "keys",
      body: s.steps.move.body,
      fragment: (
        <>
          <div className="nf-pl-frag__head">
            <span className="nf-pl-frag__plate" aria-hidden="true">
              <UiIcon name="receipt" size={20} />
            </span>
            <p className="nf-pl-frag__title">{f.receipt}</p>
            {example}
          </div>
          <ul className="nf-pl-frag__rows">
            <Row icon="file-check" label={f.kept} tone="ok" />
            <Row icon="id-card" label={f.passport} tone="ok" />
          </ul>
        </>
      ),
    },
  ];

  const n = steps.length;
  return (
    <section className="nf-pl-story" data-chapter="story" data-theme="dark" aria-labelledby="nf-pl-story-title">
      <div className="nf-shell">
        <header className="nf-pl-head nf-pl-head--center">
          <p className="nf-pl-overline">{s.overline}</p>
          <h2 id="nf-pl-story-title" className="nf-pl-title">
            {s.title}
          </h2>
          <p className="nf-pl-lede">{s.lede}</p>
        </header>
        <ol className="nf-pl-story__list" style={{ "--nf-pl-n": n } as CSSProperties}>
          {steps.map((step, k) => {
            const words = s.steps[step.key];
            return (
              <li
                key={step.key}
                id={`nf-deal-${step.key}`}
                className="nf-pl-scard"
                style={
                  {
                    "--nf-pl-k": k,
                    "--nf-pl-from": `${(k / n) * 100}%`,
                    "--nf-pl-to": `${((k + 1) / n) * 100}%`,
                  } as CSSProperties
                }
              >
                <article className="nf-pl-scard__inner">
                  <div className="nf-pl-scard__copy">
                    <span className="nf-pl-scard__index nf-numeric" aria-hidden="true">
                      {String(k + 1).padStart(2, "0")}
                    </span>
                    <p className="nf-pl-overline">{words.label}</p>
                    <h3 className="nf-pl-scard__title">{words.title}</h3>
                    <p className="nf-pl-scard__body">{step.body}</p>
                  </div>
                  <div className="nf-pl-scard__stage" aria-hidden="true">
                    <div className="nf-pl-phone">
                      <span className="nf-pl-phone__island" />
                      <span className="nf-pl-phone__ghost" />
                      <span className="nf-pl-phone__ghost" />
                      <span className="nf-pl-phone__ghost nf-pl-phone__ghost--short" />
                    </div>
                    <div className="nf-pl-frag">
                      <span className="nf-obj nf-pl-frag__obj">
                        <Icon3D name={step.object} size={64} />
                      </span>
                      {step.fragment}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
      <StoryPill
        label={s.pill}
        steps={steps.map((step) => ({ id: `nf-deal-${step.key}`, label: s.steps[step.key].label }))}
      />
    </section>
  );
}
