"use client";

import { useState } from "react";
import { RowButton, RowLink, Sheet as RowsSheet } from "@/components/app/account/rows";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

/**
 * The two sheet materials this group owns, opened in this group's own harness
 * (audit S9): `.nf-rows-sheet` (`settings-rows.css`, the account rows' sheet)
 * and `.nf-sheet` (`overlays.css`, `components/ui/Sheet.tsx`). Both open on
 * load; fixture content only, the rows the settings screens put in them.
 */
export function RowsSheetView() {
  const [open, setOpen] = useState(true);
  return (
    <RowsSheet
      open={open}
      onClose={() => setOpen(false)}
      title="Add a payment method"
      footer={
        <Button variant="secondary" full onClick={() => setOpen(false)}>
          Not now
        </Button>
      }
    >
      <RowLink href="/settings/payments" icon="wallet" label="Add a card" sub="Saved for next time" />
      <RowButton icon="trash" label="Remove this card" danger onClick={() => setOpen(false)} />
    </RowsSheet>
  );
}

export function BottomSheetView() {
  const [open, setOpen] = useState(true);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Sign out everywhere else"
      closeLabel="Close"
      reset={{ label: "Cancel", onClick: () => setOpen(false) }}
      apply={{ label: "Sign out", onClick: () => setOpen(false) }}
    >
      <p className="nf-body-sm px-md pb-md text-[var(--nf-content-secondary)]">
        Every other device holding a sign-in to this account is signed out. This one stays.
      </p>
    </Sheet>
  );
}
