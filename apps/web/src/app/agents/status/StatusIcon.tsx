"use client";

import { useEffect, useState } from "react";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

const SEEN_KEY = "nf_agent_approved_seen";

/**
 * The application status icon.
 *
 * Shield when approved, calendar while it waits, matching the page's own
 * rule. Approved also carries the platform's verified pulse
 * (`BrandIcon state="verified"`, already wired in globals.css).
 *
 * The one-time assembly animation, scale and a slight rotate settling into
 * place, is a real state transition rather than a loop: it plays only the
 * first time this browser renders an APPROVED status for this application,
 * tracked in localStorage per application reference so a refresh or a later
 * visit never replays it. The seed profile is always APPROVED (there is no
 * live approval event to listen for yet), so "the first time this device has
 * seen it" is the honest signal available, not a fabricated real-time one.
 */
export function StatusIcon({
  approved,
  applicationRef,
  icon,
}: {
  approved: boolean;
  applicationRef: string;
  icon: BrandIconName;
}) {
  const [justApproved, setJustApproved] = useState(false);

  useEffect(() => {
    if (!approved) return;
    const key = `${SEEN_KEY}:${applicationRef}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      return; // Storage unavailable: skip the one-time flourish, keep the icon.
    }
    setJustApproved(true);
  }, [approved, applicationRef]);

  return (
    <span
      className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${
        justApproved ? "nf-status-assemble" : ""
      }`}
      style={{
        background: approved
          ? "var(--nf-state-success-surface)"
          : "color-mix(in oklab, var(--nf-mode-agent) 18%, transparent)",
      }}
    >
      <span className="inline-grid h-14 w-14 place-items-center">
        <BrandIcon name={icon} fill state={approved ? "verified" : undefined} />
      </span>
    </span>
  );
}
