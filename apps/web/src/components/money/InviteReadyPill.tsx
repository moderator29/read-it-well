"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { useShare } from "@/lib/ui/use-copy";
import { motionQuiet } from "@/lib/motion/gate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import "@/app/css/money-layer.css";

/**
 * THE INVITE'S SHARE MOMENT (docs/design/references/2026-10-07/
 * invite-ready-pill.jpg): one white capsule, "Your invite is ready", with a
 * round green button at its end. It arrives as the round button alone and
 * opens into the capsule as the words slide in, then rests (framer-motion's
 * `animate()`). Tapping it hands the link to the phone's own share sheet, or
 * copies it where there is none (`useShare`, which says which happened).
 * Under reduced motion, Calm and Off it is simply ready.
 */
export function InviteReadyPill({ label, url, shareText, shareAria }: { label: string; url: string; shareText: string; shareAria: string }) {
  const share = useShare();
  const pill = useRef<HTMLButtonElement | null>(null);
  const words = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (motionQuiet()) return;
    const ease = [0.22, 1, 0.36, 1] as const;
    const a = pill.current
      ? animate(pill.current, { clipPath: ["inset(0 0 0 calc(100% - 4rem) round 2rem)", "inset(0 0 0 0rem round 2rem)"] }, { duration: 0.75, ease, delay: 0.25 })
      : null;
    const b = words.current ? animate(words.current, { opacity: [0, 1], x: [18, 0] }, { duration: 0.5, ease, delay: 0.6 }) : null;
    return () => {
      a?.stop();
      b?.stop();
    };
  }, []);

  return (
    <div className="nf-ready" data-testid="invite-ready">
      <button ref={pill} type="button" className="nf-ready__pill" onClick={() => void share({ url, text: shareText })} aria-label={shareAria}>
        <span ref={words} className="nf-ready__label">
          {label}
        </span>
        <span className="nf-ready__go" aria-hidden="true">
          <UiIcon name="arrow-up" size={22} />
        </span>
      </button>
    </div>
  );
}
