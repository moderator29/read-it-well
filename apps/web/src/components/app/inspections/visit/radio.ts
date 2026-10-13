import type { KeyboardEvent } from "react";

/**
 * THE RADIO PATTERN FOR THE VISIT'S CHOICES (visit type, day, time).
 *
 * One tab stop per group: the checked radio, or the first enabled one when
 * nothing is checked yet. Arrow keys move through the enabled radios and the
 * selection follows the focus, which is what WAI-ARIA's radio group asks
 * for. `ChipRow` does the same for chip rails; these groups are grids and
 * cards, so the rule is written once here for them.
 */
export function radioTabIndex(checked: boolean, index: number, firstEnabled: number, anyChecked: boolean): 0 | -1 {
  if (checked) return 0;
  return !anyChecked && index === firstEnabled ? 0 : -1;
}

export function onRadioKeys(event: KeyboardEvent<HTMLElement>): void {
  const delta =
    event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
  if (delta === 0) return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'));
  if (items.length === 0) return;
  event.preventDefault();
  const current = items.findIndex((el) => el === document.activeElement);
  const next = items[(Math.max(0, current) + delta + items.length) % items.length]!;
  next.focus();
  next.click();
}
