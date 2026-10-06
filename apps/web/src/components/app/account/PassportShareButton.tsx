"use client";

import { useRef, useState, useTransition } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { ActionSheetIllustrated } from "@/components/ui/ActionSheetIllustrated";
import { setRenterPassport } from "@/lib/trust/passport-actions";

type Copy = Dictionary["experienceAccount"]["passport"];

/**
 * THE SHARE CARD'S ACTION (W6). A passport is shown one conversation at a
 * time, and only to the lister in it (V-100: `share_renter_passport` checks the
 * renter is that conversation's guest). So there is no public link to hand out
 * and none is invented: sharing means choosing a conversation. The sheet is the
 * illustrated action sheet (north star 15.2): open a conversation to show it
 * there, or turn the passport off, which withdraws it from every conversation.
 *
 * Rendered only while the passport is on; off, there is nothing to show and the
 * switch below it is the one action.
 */
export function PassportShareButton({
  copy,
  dismissLabel,
}: {
  copy: Copy;
  /** The sheet's quiet dismiss, the locale's "Not now". */
  dismissLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  /* True from the tap on "Turn it off" until the server has answered. The sheet
     closes itself on any row (`ActionSheetIllustrated`), so while this is set we
     ignore that close and decide it ourselves: shut on success, held open with a
     quiet line on failure. It used to close at once, so a failed "Turn it off"
     looked exactly like a successful one while the passport stayed on (auditor A2). */
  const turningOff = useRef(false);

  const onOpenChange = (next: boolean) => {
    if (!next && turningOff.current) return;
    if (next) setError(null);
    setOpen(next);
  };

  return (
    <>
      <Button type="button" variant="secondary" size="lg" full leadingIcon="share" onClick={() => onOpenChange(true)} data-testid="passport-share">
        {copy.cardShare}
      </Button>
      <ActionSheetIllustrated
        open={open}
        onOpenChange={onOpenChange}
        title={copy.sheetTitle}
        body={error ?? copy.sheetBody}
        object="shield"
        dismissLabel={dismissLabel}
        testId="passport-share-sheet"
        rows={[
          { id: "open", label: copy.sheetOpen, hint: copy.sheetOpenHint, icon: "chat-bubble", href: "/messages" },
          {
            id: "off",
            label: copy.sheetTurnOff,
            hint: copy.sheetTurnOffHint,
            icon: "eye-off",
            /* The pending cue while the server answers (the row's held ring). */
            pending,
            onSelect: () => {
              turningOff.current = true;
              setError(null);
              startTransition(async () => {
                /* `finally`, so an action that THROWS (a dropped request)
                   also hands the sheet its own dismiss back; it used to stay
                   set and the sheet ignored "Not now" for good (audit A7). */
                try {
                  const result = await setRenterPassport({ enabled: false });
                  if (result.ok) setOpen(false);
                  else setError(result.error);
                } catch {
                  /* No sentence for a thrown action exists in this screen's
                     copy and none is invented here: the sheet stays open on
                     its own line, the row stops working, and the switch on
                     the page still reads On, which is the truth. */
                } finally {
                  turningOff.current = false;
                }
              });
            },
          },
        ]}
      />
    </>
  );
}
