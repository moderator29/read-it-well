"use client";

import { useRouter } from "next/navigation";
import { openProfileSwitcher } from "@/components/supply/profile-switcher-event";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";

/**
 * SWITCH ROLE, the last row of `50E032EA`, opening the product's real switch.
 *
 * There is exactly one sheet in this product that switches who you are here
 * as: the workspace sheet the dock's Create sheet opens
 * (`components/supply/ProfileSwitcher.tsx`). It lists Personal, every
 * workspace this account holds with its real standing (owner, agent, firm,
 * host, and the operations console for staff), and "Add a workspace". The row
 * opens THAT sheet rather than a second one, because two sheets answering the
 * same question would drift apart the first time either changed.
 *
 * HOW. The row fires the named event the sheet listens for
 * (`profile-switcher-event.ts`), which reports whether a mounted sheet
 * answered. The sheet is mounted by the app shell beside the dock, which is
 * hidden by CSS on desktop, not removed, so this holds at every width. Where
 * no sheet answered the row goes to `/profile/setup`, the workspace chooser,
 * which is the other half of the same sheet.
 */
export function SwitchRoleRow({ line, title }: { line: string; title: string }) {
  const router = useRouter();

  function open() {
    if (openProfileSwitcher()) return;
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
      {/* The same clay mark on the same Plate as the rows above (AccountBody). */}
      <span className="nf-pf-glyph nf-pf-glyph--clay" aria-hidden="true">
        <BrandIcon name="suitcase" size={36} />
      </span>
      <span className="nf-pf-row__body">
        <span className="nf-pf-row__title">{title}</span>
        <span className="nf-pf-row__sub">{line}</span>
      </span>
      <UiIcon name="chevron-right" size="sm" className="nf-pf-row__chev" />
    </button>
  );
}
