"use client";

import { useEffect, useId, useState } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { ActionSheetIllustrated } from "@/components/ui/ActionSheetIllustrated";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { feedback } from "@/lib/ui/feedback";
import { useCopy, useShare } from "@/lib/ui/use-copy";
import { useDoneFlash } from "@/lib/ui/use-done-flash";
import { INVITE_SEEN_COOKIE } from "./invite-cookie";
import "./invite-reveal.css";

/**
 * THE INVITE, AS A GIFT (north star motion 12; references 7045 and 7046).
 *
 * The founder kept replaying this reveal, so it is built as an event rather
 * than a field: a gift settles in, "Your invite is ready" rises, and the code
 * unfolds out of it as a dashed ticket whose edge draws round it while the six
 * characters land one by one. Then one pop and one haptic, and nothing else
 * moves again. The choreography is `invite-reveal.css`; this file owns what
 * CSS cannot: the haptic on the pop's clock, the copy, the share sheet and
 * the replay.
 *
 * WHEN IT PLAYS. On the first visit for this code on this device (the server
 * reads the `vallo_invite_seen` cookie and passes `autoplay`), so a returning
 * member opens the page and finds their ticket already there, in its final
 * frame, with no flash. Tapping the gift plays it again. Quiet readers (system
 * reduced motion, Calm, Off, data saver) get the final frame at once and the
 * haptic with it.
 *
 * WHAT IS TRUE. The code is the member's real one (`my_referral_code`), the
 * link is `/join/<code>`, and Copy puts exactly those on the clipboard. No
 * reward is shown or implied here: the copy under the ticket says there is
 * none, because there is none.
 */

type Copy = Dictionary["experienceAccount"]["invite"];

/** When the pop lands, on the same clock the stylesheet runs. */
const POP_AT_MS = 1160;

export function InviteTicket({
  copy,
  code,
  url,
  shareText,
  whatsappLabel,
  dismissLabel,
  autoplay,
}: {
  copy: Copy;
  code: string;
  url: string;
  /** The sentence that travels with the link, with `{url}` already filled. */
  shareText: string;
  whatsappLabel: string;
  /** The sheet's quiet dismiss, the locale's "Not now". */
  dismissLabel: string;
  /** True on the first visit for this code on this device. */
  autoplay: boolean;
}) {
  const maskId = `nf-ticket-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { quiet } = useMotionGate();
  const copyText = useCopy();
  const share = useShare();
  const [done, flash] = useDoneFlash();
  /* 0 is the settled ticket; 1 and up is a reveal playing (each replay is a
     new number, which remounts the stage so every animation restarts). */
  const [round, setRound] = useState(autoplay ? 1 : 0);
  const [sheet, setSheet] = useState(false);

  /* The one payoff haptic, on the pop's own clock. */
  useEffect(() => {
    if (round === 0) return;
    const timer = window.setTimeout(() => feedback("success"), quiet ? 0 : POP_AT_MS);
    return () => window.clearTimeout(timer);
  }, [round, quiet]);

  /* Remember that this code has been revealed on this device, so the next
     visit opens on the settled ticket. Keyed to the code: a different
     account on a shared phone has its own first reveal. */
  useEffect(() => {
    if (!autoplay) return;
    try {
      document.cookie = `${INVITE_SEEN_COOKIE}=${code}; Path=/; Max-Age=31536000; SameSite=Lax${
        window.location.protocol === "https:" ? "; Secure" : ""
      }`;
    } catch {
      /* Cookies refused: the reveal plays again next time, which is harmless. */
    }
  }, [autoplay, code]);

  const characters = code.split("");

  return (
    <section
      className="nf-gift"
      data-reveal={round > 0 ? "play" : "settled"}
      aria-label={copy.codeLabel}
      data-testid="invite-gift"
    >
      <div className="nf-gift__stage" key={`stage-${round}`}>
        <span className="nf-gift__rays" aria-hidden="true">
          <BrandIcon name="burst-rays" fill drawn={208} />
        </span>
        <button
          type="button"
          className="nf-gift__box"
          aria-label={copy.replay}
          onClick={() => setRound((n) => n + 1)}
          data-testid="invite-replay"
        >
          <BrandIcon name="gift-box" size={96} priority />
        </button>
      </div>

      <div className="nf-gift__table" key={`table-${round}`}>
        <p className="nf-gift__sealed" aria-hidden="true">
          <span>
            {copy.sealed}
            <span className="nf-gift__sealed-mark">
              <UiIcon name="arrow-down" size={16} />
            </span>
          </span>
        </p>

        <div className="nf-gift__pop">
          <div className="nf-ticket" data-testid="invite-ticket">
            <svg className="nf-ticket__edge" aria-hidden="true" focusable="false">
              <defs>
                <mask id={maskId} className="nf-ticket__mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
                  <rect className="nf-ticket__draw" pathLength={1} />
                </mask>
              </defs>
              <rect className="nf-ticket__dash" mask={`url(#${maskId})`} />
            </svg>

            <p className="nf-ticket__label">{copy.codeLabel}</p>
            <p className="nf-ticket__code nf-numeric" data-testid="invite-code" aria-label={code}>
              {characters.map((character, index) => (
                <span key={`${index}-${character}`} aria-hidden="true" style={{ "--i": index } as React.CSSProperties}>
                  {character}
                </span>
              ))}
            </p>
            <div className="nf-ticket__perf" aria-hidden="true" />
            <div className="nf-ticket__actions">
              <Button
                type="button"
                variant="primary"
                size="lg"
                full
                done={done}
                aria-label={copy.copyAria}
                onClick={() => {
                  void copyText(code, "code").then((ok) => {
                    if (ok) flash();
                  });
                }}
                data-testid="invite-copy"
              >
                {done ? copy.copied : copy.copy}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                full
                leadingIcon="share"
                aria-label={copy.shareAria}
                onClick={() => setSheet(true)}
                data-testid="invite-share"
              >
                {copy.share}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ActionSheetIllustrated
        open={sheet}
        onOpenChange={setSheet}
        title={copy.sheetTitle}
        body={copy.sheetBody}
        object="gift"
        dismissLabel={dismissLabel}
        testId="invite-share-sheet"
        rows={[
          {
            id: "link",
            label: copy.sheetCopyLink,
            hint: copy.sheetCopyLinkHint,
            icon: "link",
            onSelect: () => void copyText(url, "link"),
          },
          {
            id: "whatsapp",
            label: whatsappLabel,
            icon: "chat-bubble",
            onSelect: () => {
              window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
            },
          },
          {
            id: "more",
            label: copy.sheetMore,
            hint: copy.sheetMoreHint,
            icon: "share",
            onSelect: () => void share({ url, text: shareText }),
          },
        ]}
      />
    </section>
  );
}
