"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import Link from "next/link";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { useOverlay } from "@/lib/ui/use-overlay";

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
 * Everything here is a real control. `Switch` is a `role="switch"` button with
 * `aria-checked`. `RowSelect` is a native `<select>` covering its own row, so a
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
      {/* `.nf-card` is the platform's glass. The group used to paint its own
          flat fill and its own border, which made the account screens the one
          place in the product rendering opaque boxes. One material, everywhere. */}
      <div className="nf-sgroup__body nf-card">{children}</div>
      {note && <p className="nf-sgroup__note">{note}</p>}
    </section>
  );
}

/* -------------------------------------------------------------------- row */

function RowInner({
  icon,
  label,
  sub,
  value,
  trailing,
}: {
  icon?: UiIconName;
  label: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <>
      {icon ? (
        <span className="nf-srow__icon" aria-hidden="true">
          <UiIcon name={icon} size={ICON.row} />
        </span>
      ) : (
        /* Keeps the label column aligned in a group where only some rows carry
           a glyph, rather than letting one row start further left. */
        <span className="nf-srow__icon" aria-hidden="true" />
      )}
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
  label,
  sub,
  value,
  external,
  testId,
}: {
  href: string;
  icon?: UiIconName;
  label: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  external?: boolean;
  testId?: string;
}) {
  const inner = <RowInner icon={icon} label={label} sub={sub} value={value} trailing={Chevron} />;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="nf-srow"
        data-testid={testId}
      >
        {inner}
      </a>
    );
  }
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
        label={label}
        sub={sub}
        value={value}
        trailing={chevron ? Chevron : undefined}
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

export function Switch({
  checked,
  onChange,
  labelledBy,
  label,
  disabled,
  testId,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** The id of the visible text that names this switch. */
  labelledBy?: string;
  /** Used only when there is no visible label to point at. */
  label?: string;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      disabled={disabled}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      /* Drawn at 50x30 and given its 44px hit area by nf-tap rather than by
         being drawn that big, which is the platform's rule for every control
         smaller than a thumb. */
      className="nf-switch nf-tap"
    >
      <span className="nf-switch__knob" aria-hidden="true" />
    </button>
  );
}

/** A row whose control is a switch. */
export function RowSwitch({
  icon,
  label,
  sub,
  checked,
  onChange,
  disabled,
  testId,
}: {
  icon?: UiIconName;
  label: string;
  sub?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  testId?: string;
}) {
  const labelId = useId();
  return (
    <div className="nf-srow">
      {icon ? (
        <span className="nf-srow__icon" aria-hidden="true">
          <UiIcon name={icon} size={ICON.row} />
        </span>
      ) : (
        <span className="nf-srow__icon" aria-hidden="true" />
      )}
      <span className="nf-srow__body">
        <span id={labelId} className="nf-srow__label">
          {label}
        </span>
        {sub && <span className="nf-srow__sub">{sub}</span>}
      </span>
      <Switch
        checked={checked}
        onChange={onChange}
        labelledBy={labelId}
        disabled={disabled}
        testId={testId}
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
  label,
  sub,
  value,
  options,
  onChange,
  testId,
}: {
  icon?: UiIconName;
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
      {icon ? (
        <span className="nf-srow__icon" aria-hidden="true">
          <UiIcon name={icon} size={ICON.row} />
        </span>
      ) : (
        <span className="nf-srow__icon" aria-hidden="true" />
      )}
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

export function Segment<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div className="nf-segment" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className="nf-segment__option"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

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
      {icon ? (
        <span className="nf-srow__icon" aria-hidden="true">
          <UiIcon name={icon} size={ICON.row} />
        </span>
      ) : (
        <span className="nf-srow__icon" aria-hidden="true" />
      )}
      <span className="nf-srow__body">
        <span className="nf-srow__label">{label}</span>
        {sub && <span className="nf-srow__sub">{sub}</span>}
      </span>
      {/* On a phone the segment drops to its own line and lines up under the
          label rather than under the glyph. The indent is the glyph box plus
          the row's gap, which is the same sum the row divider is inset by, so
          the two stay aligned without either being measured by hand. */}
      <div className="w-full min-w-0 basis-full pl-[calc(1.75rem+var(--nf-gap-inline))] pt-inline sm:w-auto sm:basis-auto sm:pl-0 sm:pt-0">
        <Segment value={value} options={options} onChange={onChange} label={label} />
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
            className="nf-rows-sheet__close nf-tap"
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
