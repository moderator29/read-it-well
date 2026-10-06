"use client";

import "./badges.css";
import { useEffect, useState } from "react";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Toast, useToast } from "@/components/ui/Toast";
import { motionQuiet } from "@/lib/motion/gate";
import { feedback } from "@/lib/ui/feedback";
import { badgeObject } from "./badge-art";
import type { ProfileBadge } from "./badge-model";

/** The words the moment says, from the server page (`experienceSocial.profile`). */
export type BadgeMomentCopy = {
  overline: string;
  share: string;
  back: string;
  /** "{badge}" is replaced with the badge's name. */
  shareText: string;
  copied: string;
  replayHint: string;
};

/**
 * THE EARNED MOMENT (motion 22, reference 7043, directive D17).
 *
 * A quiet sunburst behind a matte medal, the medal scaling in over 620ms, one
 * pop (1.0 to 1.04 to 1.0 in 180ms) with one heavy haptic, then the
 * achievement named, one line saying what it means, and Share and Back rising
 * in. Tapping the medal plays it once more, and only once: a celebration that
 * can be farmed by tapping is a slot machine.
 *
 * IT IS FOR AN EARNED BADGE ONLY. The caller (`BadgeEarnedHost`, `BadgeRow`)
 * decides that from `badge.earned`, and this refuses anyway: a badge somebody
 * at Vallo gave by hand is never celebrated here, because the celebration says
 * "you did this" and the database says somebody else decided.
 *
 * The line under the title is the badge's own description from the database.
 * Nothing on this screen is written by this file: no count, no streak, no
 * "level", no comparison. Share sends the person's own page, so the recipient
 * sees the real badge on a real profile rather than a picture of one.
 *
 * It is the platform `Sheet` in its full-page form, so Back, Escape, the focus
 * trap and return, drag to close and the scroll lock are all the sheet's.
 */
export function BadgeMoment({
  badge,
  copy,
  shareUrl,
  onClose,
}: {
  badge: ProfileBadge;
  copy: BadgeMomentCopy;
  /** The person's own public page, or undefined when they have none. */
  shareUrl?: string;
  onClose: () => void;
}) {
  const { toast, show } = useToast();
  /* Bumping the key restarts every beat. Allowed once. */
  const [play, setPlay] = useState(0);
  const [replayed, setReplayed] = useState(false);
  const object = badgeObject(badge.objectName);

  /* The heavy haptic lands with the pop: after the 620ms scale-in. Quiet
     motion levels get no timer and no pop, so the page is simply settled. */
  useEffect(() => {
    if (!badge.earned || motionQuiet()) return;
    const timer = window.setTimeout(() => feedback("success"), 620);
    return () => window.clearTimeout(timer);
  }, [badge.earned, play]);

  const replay = () => {
    if (replayed) return;
    setReplayed(true);
    setPlay((n) => n + 1);
  };

  const share = () => {
    const text = copy.shareText.replace("{badge}", badge.name);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      void navigator.share({ title: badge.name, text, ...(shareUrl ? { url: shareUrl } : {}) }).catch(() => {
        /* Cancelling a share sheet is not a failure and gets no message. */
      });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(shareUrl ? `${text} ${shareUrl}` : text);
      show(copy.copied);
    }
  };

  if (!badge.earned) return null;

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={badge.name}
      hideTitle
      fullPage
      testId="badge-moment"
    >
      <div className="nf-moment" key={play}>
        <div className="nf-moment__stage">
          <div className="nf-moment__burst" aria-hidden="true" />
          <button
            type="button"
            className="nf-moment__medal"
            onClick={replay}
            aria-label={replayed ? badge.name : `${badge.name}. ${copy.replayHint}`}
          >
            <BrandIcon name="rosette" fill drawn={224} />
            <span className="nf-moment__object" aria-hidden="true">
              <BrandIcon name={object} fill drawn={96} />
            </span>
          </button>
        </div>
        <p className="nf-moment__overline">{copy.overline}</p>
        <h2 className="nf-moment__title">{badge.name}</h2>
        <p className="nf-moment__line">{badge.description}</p>
        <p className="nf-moment__date">{badge.grantedLabel}</p>
        <div className="nf-moment__actions">
          <Button variant="primary" size="lg" full leadingIcon="share" onClick={share}>
            {copy.share}
          </Button>
          <Button variant="quiet" size="lg" full onClick={onClose}>
            {copy.back}
          </Button>
        </div>
      </div>
      {toast ? <Toast message={toast.message} tone={toast.tone} /> : null}
    </Sheet>
  );
}
