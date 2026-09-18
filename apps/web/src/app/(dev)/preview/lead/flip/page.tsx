"use client";

import { getDictionary } from "@vallo/i18n";
import { SideCover } from "@/components/app/flip/SideCover";
import { MobileTabBar } from "@/components/app/MobileTabBar";

/**
 * The flip frozen mid-turn (GOVERNING-flip-mid-turn.png): the same stage,
 * card and faces `SideFlip` mounts, held at one angle so the pane's edge glow
 * and the cover can be looked at beside the render. Nothing here animates.
 */
export default function FlipPreview() {
  const t = getDictionary("en");
  return (
    <div
      className="nf-flip-stage"
      data-phase="turn"
      style={{ "--nf-flip-dir": -1 } as React.CSSProperties}
    >
      <div className="nf-flip-card" style={{ transform: "scale(0.94) rotateY(-122deg)", transition: "none" }}>
        <div className="nf-flip-face nf-flip-face--front">
          <main className="min-h-dvh bg-[var(--nf-surface-canvas)]" />
        </div>
        <SideCover side="stays" t={t} className="nf-flip-face nf-flip-face--back" />
      </div>
      <div className="fixed inset-0 -z-10 bg-[var(--nf-surface-canvas)]">
        <MobileTabBar t={t} side="property" active="/home" signedIn />
      </div>
    </div>
  );
}
