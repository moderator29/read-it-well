"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@vallo/i18n";
import { otherSide } from "@/lib/side.constants";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { useSideFlip } from "./flip/SideFlip";

/**
 * The coin: the control that turns the app over.
 *
 * Lives in the nav foot, above ThemeToggle, in both the rail and the drawer.
 * It shows the OTHER side's name and glass mark, the way `ModeSwitcher`'s menu
 * variant shows the other workspace, so the row reads as a destination rather
 * than a state. It is deliberately not a toggle switch (`Switch.tsx` means a
 * setting), not the personal-agent `ModeSwitcher` (which keeps its place inside
 * the agent workspace) and not the `RoleSwitcher` sheet on `/profile` (which
 * changes what you are here to do). Three controls, three questions, three
 * shapes.
 *
 * The token presents its edge on hover and spins on press as the viewport
 * begins its turn, so the control and the app perform the same physics. The
 * drawer variant closes the drawer as the flip starts, through the existing
 * `onNavigate` plumbing, so the drawer never turns over with the page.
 */
export function SideSwitch({
  t,
  onNavigate,
}: {
  t: Dictionary;
  /** The drawer closes itself when the flip starts. */
  onNavigate?: () => void;
}) {
  const { flip, pending, side } = useSideFlip();
  const other = otherSide(side);
  const [spinning, setSpinning] = useState(false);
  const pressed = useRef(false);
  const button = useRef<HTMLButtonElement | null>(null);

  /* When the flip this control started has settled, the keyboard lands back
     on it, now reading the other way. Nothing else on the page had focus. */
  useEffect(() => {
    if (!pending && pressed.current) {
      pressed.current = false;
      setSpinning(false);
      button.current?.focus({ preventScroll: true });
    }
  }, [pending]);

  return (
    <button
      ref={button}
      type="button"
      className="nf-side-switch nf-tap"
      disabled={pending}
      data-spinning={spinning || undefined}
      style={{ "--nf-flip-dir": other === "stays" ? -1 : 1 } as React.CSSProperties}
      onClick={() => {
        pressed.current = true;
        setSpinning(true);
        onNavigate?.();
        flip(other);
      }}
    >
      <span className="nf-side-switch__coin" aria-hidden="true">
        <BrandIcon name={other === "stays" ? "hotel" : "keys-home"} size={28} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="nf-side-switch__label">
          {other === "stays" ? t.side.switchToStays : t.side.switchToProperty}
        </span>
        <span className="nf-side-switch__sub">
          {other === "stays" ? t.side.staysSub : t.side.propertySub}
        </span>
      </span>
      <UiIcon name="chevron-right" size={16} className="nf-side-switch__chev" />
    </button>
  );
}
