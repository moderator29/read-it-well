"use client";

import { useState, useTransition } from "react";
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
  const [, startTransition] = useTransition();

  return (
    <>
      <Button type="button" variant="secondary" size="lg" full leadingIcon="share" onClick={() => setOpen(true)} data-testid="passport-share">
        {copy.cardShare}
      </Button>
      <ActionSheetIllustrated
        open={open}
        onOpenChange={setOpen}
        title={copy.sheetTitle}
        body={copy.sheetBody}
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
            onSelect: () => {
              startTransition(async () => {
                await setRenterPassport({ enabled: false });
              });
            },
          },
        ]}
      />
    </>
  );
}
