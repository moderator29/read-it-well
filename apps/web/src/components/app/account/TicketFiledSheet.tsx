"use client";

import { useState } from "react";
import { SuccessSheet } from "@/components/ui/SuccessSheet";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { successCopy } from "@/lib/ui/success-moments";

/**
 * "Message sent to support", with the reference, once.
 *
 * Mounted only after `fileSupportTicket` answered ok (the new-query form's
 * `filed`, the assistant's "bring in a person"), so it opens at filing. The
 * reference also stays on the screen under it, because a reference that is
 * only in a dismissed sheet is a reference nobody can find again.
 */
export function TicketFiledSheet({ reference, signedIn = true }: { reference: string; signedIn?: boolean }) {
  const copy = useClientCopy().success;
  const [open, setOpen] = useState(true);
  const words = successCopy(copy, signedIn ? "ticketFiled" : "contactSent", { reference });
  return (
    <SuccessSheet
      open={open}
      onOpenChange={setOpen}
      variant={words.variant}
      object={words.object}
      title={words.title}
      body={words.body}
      details={[{ label: copy.detail.reference, value: reference, mono: true }]}
      primary={{ label: copy.continue }}
      secondary={signedIn ? { label: SUPPORT_MESSAGES, href: "/support/messages" } : undefined}
    />
  );
}

const SUPPORT_MESSAGES = "Open support messages";
