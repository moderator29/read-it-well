"use client";

import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";
import { ROW_GLYPH } from "@/components/app/account/rows";

/**
 * SWITCH ROLE, the last row of `50E032EA`, opening the product's real switch.
 *
 * There is exactly one sheet in this product that switches who you are here
 * as: the workspace sheet behind the dock's centre slot
 * (`components/supply/ProfileSwitcher.tsx`). It lists Personal, every
 * workspace this account holds with its real standing (owner, agent, firm,
 * host, and the operations console for staff), and "Add a workspace". The row
 * opens THAT sheet rather than a second one, because two sheets answering the
 * same question would drift apart the first time either changed.
 *
 * HOW, AND WHY IT IS A CLICK. The sheet's open state lives inside the dock's
 * component and its only trigger is the dock button, which is a supply file
 * and not this surface's to change. So the row presses that button. It is in
 * the DOM on every route the dock renders on, including this one, at every
 * width (the dock is hidden by CSS on desktop, not removed), and
 * `HTMLElement.click()` fires the handler whether or not the button is
 * visible. Where no dock is rendered the row goes to `/profile/setup`, the
 * workspace chooser, which is the other half of the same sheet.
 *
 * The coupling to a class name is deliberate and temporary: a trigger prop on
 * the dock's switch would let it go.
 */
export const DOCK_SWITCH_SELECTOR = ".nf-tab__link--switch";

export function SwitchRoleRow({ line, title }: { line: string; title: string }) {
  const router = useRouter();

  function open() {
    const dock = document.querySelector<HTMLButtonElement>(DOCK_SWITCH_SELECTOR);
    if (dock) {
      dock.click();
      return;
    }
    router.push("/profile/setup");
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      className="nf-pf-row nf-pf-row--switch"
      data-testid="profile-switch-role"
    >
      {/* The same plate and glyph as the rows above (AccountBody). */}
      <span className="nf-pf-glyph" aria-hidden="true">
        <IconPlate size="sm" tone="brand">
          <UiIcon name="briefcase" size={ROW_GLYPH} />
        </IconPlate>
      </span>
      <span className="nf-pf-row__body">
        <span className="nf-pf-row__title">{title}</span>
        <span className="nf-pf-row__sub">{line}</span>
      </span>
      <UiIcon name="chevron-right" size="sm" className="nf-pf-row__chev" />
    </button>
  );
}
