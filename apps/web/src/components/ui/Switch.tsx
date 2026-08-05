"use client";

import { useId } from "react";

/**
 * The switch.
 *
 * Two problems, one primitive.
 *
 * The agent terms gate used a raw 16px native checkbox - a 16px target on a
 * consequential, legally-meaningful action - and the filter drawer hand-rolled
 * a second toggle that animated `left`, which lays out and paints on every
 * frame instead of compositing a transform. The settings toggle was the good
 * one, and even it painted a 28px control with a 28px hit area.
 *
 * What the references show and none of the three had: a track whose fill
 * animates, and a thumb that carries its own shadow so it reads as an object
 * sitting ON the track rather than a hole cut out of it. That shadow is most of
 * the difference between "a toggle" and "a toggle that feels physical".
 *
 * Geometry: the track paints at 52×32, because a taller track crowds a settings
 * row. The hit region is 44pt regardless, delivered by an `::after` that
 * overflows the button by 6px top and bottom, so the target grows while the
 * picture does not.
 */

export type SwitchProps = {
  checked: boolean;
  onCheckedChange(next: boolean): void;
  /**
   * The visible label. Optional: a switch inside a row that already names it -
   * a table cell, a list item - should not repeat the name. When it is omitted
   * the caller MUST pass `aria-label` or `aria-labelledby` instead, because an
   * unlabelled switch announces only "on".
   */
  label?: string;
  description?: string;
  disabled?: boolean;
  /**
   * Forwarded to the button.
   *
   * Like Chip, this primitive destructures rather than spreading a rest object,
   * which keeps stray DOM attributes off a control that owns its own
   * semantics - but it also swallowed `data-testid`, forcing every migrated
   * call site to wrap the switch in a span just to keep its test hook. Declared
   * explicitly so the hook stays on the control it identifies.
   */
  "data-testid"?: string;
  /** Accessible name when no visible `label` is rendered. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
};

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  "data-testid": testId,
  className,
  ...aria
}: SwitchProps) {
  const base = useId();
  const labelId = `${base}-label`;
  const descriptionId = `${base}-description`;

  const control = (
    <button
      data-testid={testId}
      type="button"
      role="switch"
      aria-checked={checked}
      /*
       * Labelled by the visible text when there is any, so the announced name is
       * the same text a sighted user reads. `aria-label` would silently diverge
       * from it the first time one of the two was edited.
       */
      aria-labelledby={label ? labelId : aria["aria-labelledby"]}
      aria-label={label ? undefined : aria["aria-label"]}
      aria-describedby={description ? descriptionId : undefined}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={[
        "relative h-8 w-13 shrink-0 cursor-pointer rounded-[var(--nf-radius-pill)] transition-colors motion-reduce:transition-none",
        /*
         * The 44pt floor, as a pseudo element rather than a child span.
         *
         * Both reach the same hit area - a pointer event anywhere inside a
         * button activates it, descendant or pseudo alike - but only one of
         * them can be measured. `icons-and-targets.spec` walks every control
         * on the page and reads its own box plus `::before` and `::after`,
         * which is the only expansion technique a stylesheet can describe;
         * it cannot know that some particular child span was put there to
         * grow a target rather than to draw something. So the span reported
         * as 52x32 and failed a floor it was actually meeting.
         *
         * -6px top and bottom on a 32px track is 44. The track still paints
         * at 32 and the settings row keeps its rhythm.
         */
        "after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
        "disabled:cursor-not-allowed disabled:opacity-45",
        label ? "" : className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: checked
          ? "var(--nf-brand-primary)"
          : "color-mix(in oklab, var(--nf-content-primary) 12%, transparent)",
        boxShadow: checked
          ? "0 0 16px -2px color-mix(in oklab, var(--nf-brand-primary) 55%, transparent), inset 0 1px 2px color-mix(in oklab, var(--nf-surface-canvas) 45%, transparent)"
          : "inset 0 1px 3px color-mix(in oklab, var(--nf-surface-canvas) 55%, transparent)",
        transitionDuration: "var(--nf-duration-base)",
        transitionTimingFunction: "var(--nf-ease-standard)",
      }}
    >
      {/*
        The thumb travels on a transform, never on `left`. `left` is a layout
        property: the browser reflows the row on every frame of a 240ms
        animation, and in a settings list of eighteen switches that is eighteen
        chances to drop frames. A transform is composited.

        Spring easing on the travel and standard easing on the track fill is
        deliberate - the object overshoots slightly and settles, the colour does
        not, which is how both read as the same physical event.
      */}
      <span
        aria-hidden="true"
        className="absolute left-1 top-1/2 block size-6 -translate-y-1/2 rounded-[var(--nf-radius-pill)] transition-transform motion-reduce:transition-none"
        style={{
          background: "var(--nf-content-on-brand)",
          boxShadow: "var(--nf-elev-1)",
          transform: `translate(${checked ? "1.25rem" : "0"}, -50%)`,
          transitionDuration: "var(--nf-duration-base)",
          transitionTimingFunction: "var(--nf-ease-spring)",
        }}
      />
    </button>
  );

  if (!label) return control;

  return (
    <div
      className={["flex items-center justify-between gap-4", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0 flex-1">
        <p
          id={labelId}
          className="text-[var(--nf-text-body-lg)] font-medium text-[var(--nf-content-primary)]"
        >
          {label}
        </p>
        {description ? (
          <p
            id={descriptionId}
            className="mt-0.5 text-[var(--nf-text-caption)] text-[var(--nf-content-muted)]"
          >
            {description}
          </p>
        ) : null}
      </div>
      {control}
    </div>
  );
}
