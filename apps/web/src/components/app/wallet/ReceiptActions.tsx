"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * The two things anybody does with a receipt: copy the reference, or send it on.
 *
 * NEITHER IS A DOWNLOAD, and that is deliberate rather than a gap. A "download
 * PDF" button needs a renderer somewhere; what people actually do with a
 * receipt on a phone is screenshot it and put it in a chat, which needs
 * nothing from us and already works. Offering a download that produced a
 * worse artefact than the screenshot they were going to take anyway would be
 * a button added for the look of the thing.
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
    <div className="grid grid-cols-2 gap-row">
      <Button type="button" variant="secondary" onClick={() => void copy(reference)}>
        {copied ? "Copied" : "Copy reference"}
      </Button>
      <Button type="button" variant="secondary" onClick={() => void share()}>
        Share
      </Button>
    </div>
  );
}
