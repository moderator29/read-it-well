"use client";

import type { ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Button } from "@/components/ui/Button";
import { ICON, Surface, TYPE } from "@/components/app/Screen";

/**
 * THE FRAME EVERY SCREEN OF THE THREE REGISTRATION FORMS STANDS IN.
 *
 * `GOVERNING-03`, `04` and `05` are twelve screens and one anatomy: a back
 * square beside the form's own name, the progress row of small filled
 * rectangles, a large heading, one supporting line, the screen's content, and
 * a single lit control at the foot. Written once here so the twelve cannot
 * drift from each other, which is the same argument `Screen.tsx` makes about
 * the rest of the product.
 *
 * ONE BACK CONTROL, AND IT MEANS THE SAME THING EVERY TIME. The renders draw a
 * chevron at the top and a second one beside the progress row; two controls
 * that do the same thing is two chances to do the wrong one. There is one, it
 * steps back through the form, and on the first screen it leaves the form. A
 * person on screen three pressing back expects screen two, and nothing else.
 *
 * THE PROGRESS ROW IS `aria-hidden`, as B1's chooser already draws it: the
 * heading says where you are and `stepOf` states it in words for anybody using
 * a screen reader, so a reader counting bars would be hearing noise.
 */

export function RegisterShell({
  formTitle,
  heading,
  sub,
  steps,
  current,
  stepOfLabel,
  backLabel,
  onBack,
  mark,
  children,
  primary,
  secondary,
  error,
}: {
  /** The form's own name, on the top row: "Register as an owner". */
  formTitle: string;
  /**
   * This screen's heading, the loudest thing on it. An empty string draws no
   * heading element at all, which the confirmation screen wants: it carries
   * its own heading under its object, and an empty `h2` is still a heading to
   * a screen reader.
   */
  heading: string;
  sub?: string;
  steps: number;
  /** Zero based. */
  current: number;
  /** "Step 2 of 4", spoken rather than drawn. */
  stepOfLabel: string;
  backLabel: string;
  onBack(): void;
  /**
   * The small glass object in the top right corner, which three of the twelve
   * screens carry. Omitted on the rest, exactly as the renders omit it.
   */
  mark?: BrandIconName;
  children: ReactNode;
  primary?: { label: string; onClick(): void; disabled?: boolean; icon?: UiIconName };
  secondary?: { label: string; onClick(): void };
  /**
   * A refusal that belongs to the whole screen rather than to one field.
   *
   * `role="alert"` and the error colour AND the words, because colour alone
   * fails anybody who cannot see it.
   */
  error?: string | null;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-heading flex items-center gap-md">
        <button
          type="button"
          aria-label={backLabel}
          onClick={onBack}
          className="nf-icon-btn nf-icon-btn--glass h-11 w-11 shrink-0"
        >
          <UiIcon name="arrow-left" size={ICON.inline} />
        </button>
        <h1 className={`min-w-0 flex-1 ${TYPE.rowTitle}`}>{formTitle}</h1>
        {mark ? (
          <span className="shrink-0" aria-hidden="true">
            <BrandIcon name={mark} size={44} />
          </span>
        ) : null}
      </div>

      <div className="nf-steprow" aria-hidden="true">
        {Array.from({ length: steps }, (_, index) => (
          <span key={index} className="nf-steprow__bar" data-on={index <= current || undefined} />
        ))}
      </div>
      {/* The position in words, for the reader the bars tell nothing. */}
      <p className="sr-only" aria-live="polite">
        {stepOfLabel}
      </p>

      {/* The confirmation screen carries its own heading inside its object, so
          it passes none here and none is drawn. An empty heading element is a
          heading to a screen reader. */}
      {/* Keyed by the step (Track M): each step is a new arrival, so the
          heading comes out of depth and the body pushes forward, rather than
          the words changing in place under a still frame. */}
      {heading ? (
        <h2 key={`h-${current}`} className={`mt-heading nf-flow-title ${TYPE.display}`}>
          {heading}
        </h2>
      ) : null}
      {sub ? (
        <p key={`s-${current}`} className={`mt-inline-tight max-w-[52ch] nf-flow-sub ${TYPE.bodyLg}`}>
          {sub}
        </p>
      ) : null}

      <div key={`b-${current}`} className="mt-heading nf-flow-step">
        {children}
      </div>

      {error ? (
        <p
          role="alert"
          className="nf-arrive mt-heading text-[length:var(--nf-text-body-sm)] font-medium text-[var(--nf-state-error)]"
        >
          {error}
        </p>
      ) : null}

      {primary || secondary ? (
        <div className="mt-section-tight flex flex-col gap-inline">
          {primary ? (
            <Button
              onClick={primary.onClick}
              variant="primary"
              size="lg"
              full
              disabled={primary.disabled ?? false}
              {...(primary.icon ? { trailingIcon: primary.icon } : {})}
            >
              {primary.label}
            </Button>
          ) : null}
          {secondary ? (
            <Button onClick={secondary.onClick} variant="secondary" size="md" full>
              {secondary.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * THE CALM EXPLANATORY PANEL, which appears on almost every screen in the set.
 *
 * B1 wrote `.nf-calmpanel` for the chooser and this is the same object with a
 * caller-chosen glyph, so the two surfaces cannot drift apart. The glyph is
 * round and that is not an exception: a bare glyph on a tint is a shape rather
 * than a control, and the shape law says so in as many words.
 */
export function CalmPanel({
  icon = "info",
  title,
  body,
}: {
  icon?: UiIconName;
  title?: string;
  body: string;
}) {
  return (
    <div className="nf-calmpanel">
      <span className="nf-calmpanel__glyph" aria-hidden="true">
        <UiIcon name={icon} size="sm" />
      </span>
      <span className="min-w-0 flex-1">
        {title ? <span className={`block ${TYPE.rowTitle}`}>{title}</span> : null}
        <span className={`${title ? "mt-inline-tight " : ""}block ${TYPE.rowMeta}`}>{body}</span>
      </span>
    </div>
  );
}

/**
 * ONE OF THE THREE LINES ON A CONFIRMATION SCREEN.
 *
 * The tick plate is a small rounded RECTANGLE and deliberately NOT the
 * circular `verified-badge`. That mark is the platform's trust mark and it
 * means a human checked somebody; a list of things that are about to happen
 * has not been checked by anybody and may not borrow it.
 */
export function NextRow({ children }: { children: ReactNode }) {
  return (
    <li className="nf-nextrow">
      <span className="nf-nextrow__tick" aria-hidden="true">
        <UiIcon name="arrow-right" size={12} />
      </span>
      <span className={`min-w-0 flex-1 ${TYPE.body}`}>{children}</span>
    </li>
  );
}

/**
 * THE CONFIRMATION SCREEN, which all three forms end on.
 *
 * The object standing on its pool of brand light, the heading, one line, the
 * three things that happen next, and the honest timing label. The object is a
 * `BrandIcon`, the pool is `.nf-regobject`'s own wash, and neither carries
 * text.
 */
export function RegisterDone({
  object,
  heading,
  sub,
  filedLine,
  whatNext,
  lines,
  timing,
  note,
  children,
}: {
  object: BrandIconName;
  heading: string;
  sub: string;
  /** "Filed as VL-AGT-00001", already interpolated by the caller. */
  filedLine: string;
  whatNext: string;
  lines: readonly string[];
  /** "Usually two working days". A rectangle, never a capsule: see the CSS. */
  timing: string;
  /** One extra sentence this particular registration owes the person. */
  note?: string | null;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="nf-regobject">
        <BrandIcon name={object} size={128} priority />
      </div>

      <h2 className={`mt-heading text-center ${TYPE.display}`}>{heading}</h2>
      <p className={`mt-inline-tight text-center ${TYPE.bodyLg}`}>{sub}</p>

      {/* The reference is the loudest thing after the heading, because it is
          what support asks for. It is set in the numeral face for the same
          reason every other identifier in this product is. */}
      <p className="mt-group text-center font-[family-name:var(--nf-font-numeric)] text-[length:var(--nf-text-h4)] font-semibold text-[var(--nf-content-primary)]">
        {filedLine}
      </p>

      <Surface tone="glass" className="mt-section-tight">
        <h3 className={TYPE.sectionTitle}>{whatNext}</h3>
        <ul className="mt-group grid gap-group">
          {lines.map((line) => (
            <NextRow key={line}>{line}</NextRow>
          ))}
        </ul>
      </Surface>

      {note ? <CalmPanel body={note} /> : null}

      <p className="mt-heading">
        <span className="nf-marklabel">
          <UiIcon name="history" size={16} />
          {timing}
        </span>
      </p>

      {children}
    </>
  );
}
