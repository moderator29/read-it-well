"use client";

import "./pro.css";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { feedback } from "@/lib/ui/feedback";
import { proViewCookieString } from "./pro-view";

/**
 * THE SWITCH ITSELF (north star 14.2): a labelled toggle at 999px, because a
 * pill says "this is a setting you flip" (D2), carrying the word Pro and
 * nothing else. Never a crown, a diamond, gold or a padlock.
 *
 * Only ever rendered by `ProSwitch` after the server has said the member holds
 * a plan, so this component has no locked, disabled or teaser state: there is
 * no prop that could draw one.
 *
 * Flipping it writes the device preference and asks the server to render the
 * page again (`router.refresh`), because the Pro surface is drawn on the server
 * from the same entitlement, never toggled in the browser alone. The thumb
 * moves at once on `drift` (MOTION_SYSTEM, Toggle, 240ms), with the light
 * "select" haptic of the toggle grammar; the surface's own unlock motion is
 * `ProUnlock`'s.
 */
export function ProToggle({
  initialOn,
  label,
  switchLabel,
}: {
  initialOn: boolean;
  /** The word on the control: "Pro". */
  label: string;
  /** Its accessible name: "Pro view". */
  switchLabel: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();

  const flip = () => {
    const nextOn = !on;
    setOn(nextOn);
    feedback("select");
    try {
      document.cookie = proViewCookieString(nextOn, window.location.protocol === "https:");
    } catch {
      /* A refused preference only means the view resets next visit. */
    }
    startTransition(() => router.refresh());
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={switchLabel}
      aria-busy={pending || undefined}
      className="nf-pro-switch"
      data-on={on ? "" : undefined}
      onClick={flip}
    >
      <span className="nf-pro-switch__word">{label}</span>
      <span className="nf-pro-switch__track" aria-hidden="true">
        <span className="nf-pro-switch__thumb" />
      </span>
    </button>
  );
}
