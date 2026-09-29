"use client";

import { useState } from "react";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { SuccessSheet } from "@/components/ui/SuccessSheet";
import { Button } from "@/components/ui/Button";
import { successCopy, type SuccessVariant } from "@/lib/ui/success-moments";

/** A page behind the sheet, so the backdrop has something to sit over. */
export function Preview({ variant, still }: { variant: SuccessVariant; still: boolean }) {
  const copy = useClientCopy().success;
  const [open, setOpen] = useState(true);
  const moment = variant === "submitted" ? "listingSubmitted" : variant === "approved" ? "listingLive" : "stayPaid";
  const words = successCopy(copy, moment);
  return (
    <main className="mx-auto grid max-w-2xl gap-md p-md" data-still={still ? "1" : undefined}>
      {still ? <style>{`.nf-success *, .nf-sheet--card { animation: none !important; transition: none !important; }`}</style> : null}
      <h1 className="nf-h2">Checkout</h1>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="nf-panel nf-panel--card block h-24 p-md" />
      ))}
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open again
      </Button>
      <SuccessSheet
        open={open}
        onOpenChange={setOpen}
        variant={words.variant}
        title={words.title}
        body={words.body}
        amount={variant === "success" ? { minorUnits: 48_500_000 } : undefined}
        details={
          variant === "success"
            ? [
                { label: copy.detail.for, value: "Two-bedroom flat, Yaba" },
                { label: copy.detail.reference, value: "rm-book-7f3a9c21e4", mono: true },
              ]
            : [{ label: copy.detail.for, value: "Two-bedroom flat, Yaba" }]
        }
        primary={{ label: copy.continue }}
        secondary={variant === "success" ? { label: copy.close } : undefined}
        haptic={false}
      />
    </main>
  );
}
