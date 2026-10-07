"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useShare } from "@/lib/ui/use-copy";
import { motionQuiet } from "@/lib/motion/gate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import "@/app/css/money-layer.css";

/**
 * THE INVITE'S SHARE MOMENT (docs/design/references/2026-10-07/
 * invite-ready-pill.jpg): one white capsule, "Your invite is ready", with a
 * round green button at its end. It arrives as the round button alone and
 * opens into the capsule as the words slide in, then rests. Tapping it hands
 * the link to the phone's own share sheet, or copies it where there is none
 * (`useShare`, which says which happened). Under reduced motion, Calm and Off
 * it is simply ready.
 */
export function InviteReadyPill({ label, url, shareText, shareAria }: { label: string; url: string; shareText: string; shareAria: string }) {
  const share = useShare();
  const [quiet, setQuiet] = useState(true);
  useEffect(() => setQuiet(motionQuiet()), []);
  const still = quiet ? { initial: false as const } : {};

  return (
    <div className="nf-ready" data-testid="invite-ready">
      <motion.button
        type="button"
        className="nf-ready__pill"
        onClick={() => void share({ url, text: shareText })}
        aria-label={shareAria}
        initial={{ clipPath: "inset(0 0 0 calc(100% - 4rem) round 999px)" }}
        animate={{ clipPath: "inset(0 0 0 0 round 999px)" }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        {...still}
      >
        <motion.span
          className="nf-ready__label"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
          {...still}
        >
          {label}
        </motion.span>
        <span className="nf-ready__go" aria-hidden="true">
          <UiIcon name="arrow-up" size={22} />
        </span>
      </motion.button>
    </div>
  );
}
