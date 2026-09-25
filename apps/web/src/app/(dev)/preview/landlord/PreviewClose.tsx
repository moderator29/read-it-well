"use client";

import { useState } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { CloseListingSheet } from "@/app/agent/listings/CloseListingSheet";

/** Opens the real close sheet over a fixture listing, for the harness only. */
export function PreviewClose({ copy }: { copy: Dictionary["landlord"]["close"] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-md">
      <Button type="button" variant="secondary" onClick={() => setOpen(true)} data-testid="preview-open-close">
        {copy.action}
      </Button>
      {open && (
        <CloseListingSheet
          listingId="00000000-0000-4000-8000-000000000003"
          title="Two bedroom apartment, Ikeja GRA"
          copy={copy}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
