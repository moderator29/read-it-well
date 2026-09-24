"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import Link from "next/link";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { useOverlay } from "@/lib/ui/use-overlay";
import { Switch } from "@/components/ui/Switch";
import { Segmented } from "@/components/ui/Segmented";
import { IconPlate } from "@/components/ui/IconPlate";

/**
 * Grouped rows: the one shape every account surface on this platform uses.
 *
 * A settings screen was ten cards, each with its own inner layout and its own
 * idea of where a label sits. Nothing was wrong with any single one of them and
 * the stack had no rhythm at all. These primitives replace the whole argument
 * with one row object: glyph, label, and then whatever the row is actually for.
 *
 * The value on the right is the point. A row reading "Appearance" makes you
 * open it to learn what it is set to. "Appearance    Dark" has answered before
 * you touched it, and that is the difference between a settings screen you read
 * and one you excavate.
 *
 * Everything here is a real control. The switch is the platform primitive
 * (`components/ui/Switch.tsx`) rather than a copy of it, which it was until
 * the uniqueness sweep. `RowSelect` is a native `<select>` covering its own row, so a
 * phone opens the picker it already knows and a keyboard behaves. `Sheet`
 * closes on Escape, traps focus and locks the page behind it. None of that is
 * optional on a screen where somebody turns off notifications or deletes an
 * account.
 */

/* ------------------------------------------------------------------ group */

export function SettingsGroup({
  label,
  note,
  children,
}: {
  /** Names the group. Sits outside the card, quiet, so the card stays a list. */
  label?: string;
  /** One sentence under the card, when the group needs explaining. */
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    /* The label is both visible and the section's accessible name. Naming it
       twice would make a screen reader read the heading, then announce the
       region by the same words again. */
    <section className="nf-sgroup" aria-label={label}>
      {label && (
        <h2 className="nf-sgroup__label" aria-hidden="true">
          {label}
        </h2>
      )}
      {/* The shared panel (`components/ui/Panel.tsx`'s class): the console's
          lit glass, one material for every container on the platform since
          the sweep of 23 September. The group paints nothing of its own. */}
      <div className="nf-sgroup__body nf-panel nf-panel--card">{children}</div>
      {note && <p className="nf-sgroup__note">{note}</p>}
    </section>
  );
}

/* -------------------------------------------------------------------- row */

/**
 * A row's leading glyph, on the shared icon plate.
 *
 * `7F96BE6C` draws every settings row glyph as a white line drawing inside a
 * lit glass tile, and the platform sweep of 23 September made that tile ONE
 * object: `IconPlate` (`components/ui/IconPlate.tsx`), the console's plate.
 * So this slot no longer draws a tile of its own and no longer hands the job
 * to a pack artwork that carries its own; it puts the line glyph on the
 * shared plate. `glyph` is any line glyph a caller draws (the hub's
 * `SettingsGlyph`), `icon` is a `UiIcon` name. A row that passes neither
 * still gets the slot, empty, so a group where only some rows carry a mark
 * keeps one rail.
 */
/**
 * The plate is the small rung, 36px, because `7F96BE6C` draws its row tiles
 * at 55px of a 658px screen, which is 33px at 390; the glyph inside is 20,
 * the render's 30px line drawing at the same scale (18), on the icon grid's
 * nearest size. Exported so a caller drawing its own glyph uses the same one.
 */
export const ROW_GLYPH = 20;

function RowGlyph({
  icon,
  glyph,
  danger,
}: {
  icon?: UiIconName;
  glyph?: ReactNode;
  /** A row that does something irreversible takes the plate's rose tone. */
  danger?: boolean;
}) {
  const mark = glyph ?? (icon ? <UiIcon name={icon} size={ROW_GLYPH} /> : null);
  return (
    <span className="nf-srow__icon" aria-hidden="true">
      {mark ? (
        <IconPlate size="sm" tone={danger ? "error" : "brand"}>
          {mark}
        </IconPlate>
      ) : null}
    </span>
  );
}

function RowInner({
  icon,
  glyph,
  label,
  sub,
  value,
  trailing,
  danger,
}: {
  icon?: UiIconName;
  glyph?: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
  danger?: boolean;
}) {
  return (
    <>
      <RowGlyph icon={icon} glyph={glyph} danger={danger} />
      <span className="nf-srow__body">
        <span className="nf-srow__label">{label}</span>
        {sub && <span className="nf-srow__sub">{sub}</span>}
      </span>
      {value !== undefined && value !== null && value !== "" && (
        <span className="nf-srow__value">{value}</span>
      )}
      {trailing}
    </>
  );
}

const Chevron = (
  <span className="nf-srow__chev" aria-hidden="true">
    <UiIcon name="chevron-down" size={ICON.inline} className="-rotate-90" />
  </span>
);

/** A row that goes somewhere. */
export function RowLink({
  href,
  icon,
  glyph,
  label,
  sub,
  value,
  testId,
}: {
  href: string;
  icon?: UiIconName;
  /** The blue glass object, where the governing image draws one. */
  glyph?: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  testId?: string;
}) {
  const inner = (
    <RowInner icon={icon} glyph={glyph} label={label} sub={sub} value={value} trailing={Chevron} />
  );

  /*
   * `external` STOOD HERE AND IT IS DELETED.
   *
   * It rendered this row as `<a target="_blank" rel="noreferrer noopener">`
   * instead of a `Link`. NOT ONE CALL SITE EVER SET IT: every settings row in
   * the product is internal. It existed so that the first "Help centre" or
   * "Status page" row could quietly leave the platform, which is the one
   * thing a settings list must not do.
   *
   * A settings row that genuinely needs content from elsewhere gets the
   * consented interstitial, which names the host before anybody travels.
   */
  return (
    <Link href={href} className="nf-srow" data-testid={testId}>
      {inner}
    </Link>
  );
}

/** A row that does something here. */
export function RowButton({
  onClick,
  icon,
  glyph,
  label,
  sub,
  value,
  danger,
  disabled,
  chevron = true,
  testId,
}: {
  onClick: () => void;
  icon?: UiIconName;
  /** The blue glass object, where the governing image draws one. */
  glyph?: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  chevron?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`nf-srow${danger ? " nf-srow--danger" : ""}`}
    >
      <RowInner
        icon={icon}
        glyph={glyph}
        label={label}
        sub={sub}
        value={value}
        trailing={chevron ? Chevron : undefined}
        danger={danger}
      />
    </button>
  );
}

/** A row that only states a fact. */
export function RowValue({
  icon,
  label,
  sub,
  value,
  testId,
}: {
  icon?: UiIconName;
  label: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="nf-srow" data-testid={testId}>
      <RowInner icon={icon} label={label} sub={sub} value={value} />
    </div>
  );
}

/* ----------------------------------------------------------------- switch */

/*
 * THE SECOND OF THREE SWITCHES STOOD HERE, AND IT IS GONE.
 *
 * The platform had three: `components/ui/Switch.tsx` at 52x32 with a 24px
 * thumb, this one at 50x30 with a 22px knob, and a third hand-rolled in
 * `app/agent/list/ListingWizard.tsx` at 48x28 with a 20px knob that animated
 * `left` rather than a transform and painted the agent gradient when on while
 * every other switch on the platform painted the brand. Three geometries, two
 * knob class names (`__thumb` here, `__knob` there), and two competing
 * `.nf-switch` blocks in two stylesheets, one supplying the paint and the
 * other silently supplying the geometry through nothing but import order.
 *
 * No knob ever actually escaped its track. The research measured all three
 * and they are all contained. The defect was never a visual escape; it was
 * that one control was three objects, so a fix applied to one of them was a
 * fix applied to a third of the product.
 *
 * `RowSwitch` below now renders the platform primitive. The props line up
 * one for one, and the row gains the thing this copy never had: the on-state
 * bloom at `controls.css:709`, which only ever reached `__thumb`.
 *
 * HANDED TO GROUP B, who own the stylesheets: `.nf-switch`,
 * `.nf-switch__knob` and `.nf-switch[aria-checked="true"] .nf-switch__knob`
 * in `app/settings-rows.css` are now unreferenced and should go, which also
 * ends the double declaration of `.nf-switch` that `app/globals.css:42` does
 * not list among its three deliberate ones.
 */

/** A row whose control is a switch. */
export function RowSwitch({
  icon,
  glyph,
  label,
  sub,
  value,
  checked,
  onChange,
  disabled,
  testId,
}: {
  icon?: UiIconName;
  /** The blue glass object, where the governing image draws one. */
  glyph?: ReactNode;
  label: string;
  sub?: ReactNode;
  /** The state in a word beside the switch ("On"), as the settings render
      draws it, so colour is never the only signal. */
  value?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  const labelId = useId();
  return (
    <div className="nf-srow">
      <RowGlyph icon={icon} glyph={glyph} />
      <span className="nf-srow__body">
        <span id={labelId} className="nf-srow__label">
          {label}
        </span>
        {sub && <span className="nf-srow__sub">{sub}</span>}
      </span>
      {value !== undefined && value !== null && value !== "" && (
        <span className="nf-srow__value nf-srow__value--switch" aria-hidden="true">
          {value}
        </span>
      )}
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-labelledby={labelId}
        disabled={disabled}
        data-testid={testId}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- select */

/**
 * A row whose control is a native select.
 *
 * The select is transparent and covers the whole row, so the row itself is the
 * hit area and the phone opens its own wheel. Nothing here reimplements a
 * listbox: a custom one would need roving focus, type-ahead and a portal to
 * behave as well as the control every browser already ships.
 */
export function RowSelect<T extends string>({
  icon,
  glyph,
  label,
  sub,
  value,
  options,
  onChange,
  testId,
}: {
  icon?: UiIconName;
  /** The blue glass object, where the governing image draws one. */
  glyph?: ReactNode;
  label: string;
  sub?: ReactNode;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  testId?: string;
}) {
  const labelId = useId();
  const current = options.find((o) => o.value === value);

  return (
    <div className="nf-srow">
      <select
        className="nf-srow__select"
        value={value}
        aria-labelledby={labelId}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* The face is drawn as ordinary row children, not wrapped, so the row's
          own flex rhythm applies to it exactly as it does to every other row.
          Only the focus ring needs to know the two are related, and the
          adjacent-sibling rule in the stylesheet handles that. */}
      <RowGlyph icon={icon} glyph={glyph} />
      <span className="nf-srow__body">
        <span id={labelId} className="nf-srow__label">
          {label}
        </span>
        {sub && <span className="nf-srow__sub">{sub}</span>}
      </span>
      <span className="nf-srow__value">{current?.label ?? value}</span>
      <span className="nf-srow__chev" aria-hidden="true">
        <UiIcon name="chevron-down" size={ICON.inline} />
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- segment */

/*
 * `Segment` STOOD HERE, THE SIXTH OF ELEVEN WAYS TO DRAW A SEGMENTED CONTROL.
 *
 * It was a `role="group"` of `aria-pressed` buttons on `.nf-segment__option`,
 * and it had three faults the platform primitive does not:
 *
 *   1. `aria-pressed` on a group of mutually exclusive choices announces three
 *      independent toggles, not one choice out of three. `Segmented` offers
 *      `tablist` and `radiogroup` and both are correct for what they name.
 *   2. No keyboard movement. A group of buttons is tab, tab, tab; a radiogroup
 *      and a tablist both move on the arrow keys, and `Segmented` does.
 *   3. `.nf-segment__option` is `flex: 1 1 0` with no `min-width: 0` and its
 *      label is a bare text node, so a long word in Hausa or Igbo paints
 *      outside the track with nothing to clip it. Same sentence as everywhere
 *      else in this sweep: freeing the basis is not freeing the item.
 *
 * And its shape: 14px of radius on a 32px control is 0.438, over the 0.35
 * watch line and within a hair of the capsule line. `Segmented`'s `md` rung is
 * 44px, where the same token draws 0.318.
 *
 * `RowSegment` below renders the primitive. HANDED TO GROUP B, who own the
 * stylesheets: `.nf-segment` and `.nf-segment__option` in
 * `app/settings-rows.css` are now unreferenced by any markup.
 */

/** A row whose control is a small set of choices, shown rather than hidden. */
export function RowSegment<T extends string>({
  icon,
  label,
  sub,
  value,
  options,
  onChange,
}: {
  icon?: UiIconName;
  label: string;
  sub?: ReactNode;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="nf-srow flex-wrap">
      <RowGlyph icon={icon} />
      <span className="nf-srow__body">
        <span className="nf-srow__label">{label}</span>
        {sub && <span className="nf-srow__sub">{sub}</span>}
      </span>
      {/* On a phone the segment drops to its own line and lines up under the
          label rather than under the glyph. The indent is the glyph box plus
          the row's gap, which is the same sum the row divider is inset by, so
          the two stay aligned without either being measured by hand. */}
      <div className="w-full min-w-0 basis-full pl-[calc(var(--nf-plate-size-sm)+var(--nf-gap-inline))] pt-inline sm:w-auto sm:basis-auto sm:pl-0 sm:pt-0">
        <Segmented<T>
          semantics="radio"
          full
          value={value}
          options={options}
          onChange={onChange}
          label={label}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ sheet */

/**
 * A sheet.
 *
 * Escape closes it, focus is trapped inside it, the page behind it does not
 * scroll, and focus returns to whatever opened it. Those four are the whole
 * difference between a modal and a div that happens to be on top, and all four
 * now come from `lib/ui/use-overlay` rather than being written out here.
 *
 * The hand-rolled version set `body.style.overflow` outright and restored
 * whatever it had captured on the way out. Open a sheet from inside a drawer
 * that is already holding the page still and the sheet closing hands scrolling
 * straight back to a page nobody can see, under a drawer that is still up. The
 * shared hook COUNTS its openers, so the page only moves again when the last
 * overlay has gone.
 *
 * `autoFocus` is off here deliberately. This sheet has always focused its own
 * panel rather than the first control inside it: landing on Close would read to
 * a screen reader as though the sheet were already finished.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = useCallback(() => onClose(), [onClose]);

  useOverlay({ open, onClose: close, panelRef, autoFocus: false });

  /*
   * The panel, not the first control, and deliberately AFTER the hook.
   *
   * Effect order is load-bearing here. `useOverlay` reads `document.activeElement`
   * to learn who opened the sheet, so anything that moves focus has to run
   * second or the hook records the panel as its own opener and, on close, hands
   * focus back to an element that is being removed. A first attempt did this in
   * a ref callback, which fires during commit and therefore BEFORE any effect;
   * the sheet closed and focus landed on the body instead of the row.
   */
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="nf-rows-sheet__scrim" onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="nf-rows-sheet"
      >
        <div className="nf-rows-sheet__head">
          <h2 id={titleId} className="nf-rows-sheet__title">
            {title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="nf-icon-btn nf-rows-sheet__close"
          >
            <UiIcon name="close" size={ICON.inline} />
          </button>
        </div>
        <div className="nf-rows-sheet__body">{children}</div>
        {footer && <div className="nf-rows-sheet__foot">{footer}</div>}
      </div>
    </>
  );
}

/**
 * A row that downloads a file from our own origin. A plain anchor, never a
 * `Link`: the target is an API route, and a client-side navigation or a
 * prefetch of it would be a wasted (or, for an export, a costly) request.
 */
export function RowDownload({
  href,
  icon,
  label,
  sub,
  testId,
}: {
  href: string;
  icon?: UiIconName;
  label: ReactNode;
  sub?: ReactNode;
  testId?: string;
}) {
  return (
    <a href={href} download className="nf-srow" data-testid={testId}>
      <RowInner icon={icon} label={label} sub={sub} trailing={Chevron} />
    </a>
  );
}
