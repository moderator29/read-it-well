"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * The two things anybody does with a receipt: copy the reference, or send it on.
 *
 * And a third, Print (MON-16): a landlord asking for proof of payment wants
 * a document, and the browser's own print dialog prints the receipt alone or
 * saves it as a PDF with nothing to render on our side. The share text
 * carries the amount, the parties' details and the issuer, so it proves
 * something on its own.
 *
 * Share falls back to copy where the Web Share API is absent - desktop
 * browsers, mostly - rather than being hidden there. A control that vanishes
 * on some machines is harder to explain to somebody on the phone to support
 * than one that does something slightly different.
 */
export function ReceiptActions({
  reference,
  summary,
}: {
  reference: string;
  summary: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard refused, usually an insecure context. The reference is
         `select-all` on the row above, so there is still a way to take it and
         nothing here needs to shout about the failure. */
    }
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Vallo receipt", text: summary });
        return;
      } catch {
        /* Dismissed the share sheet, which is not an error. */
      }
      return;
    }
    await copy(summary);
  };

  return (
    <div className="nf-receipt-actions grid grid-cols-3 gap-row">
      <Button type="button" variant="secondary" onClick={() => void copy(reference)}>
        {copied ? "Copied" : "Copy reference"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => void share()}>
        Share
      </Button>
      {/* MON-16. The browser's print, which also saves as a PDF; the print
          rules in wallet.css print the receipt alone. */}
      <Button type="button" variant="secondary" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}
