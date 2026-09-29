"use client";

import { useState } from "react";
import { SuccessSheet } from "@/components/ui/SuccessSheet";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { successCopy } from "@/lib/ui/success-moments";

/**
 * "Application sent", over the done screen of the three registration forms.
 *
 * Mounted by the form only in the render that follows
 * `submitSupplyRegistration`'s ok (the `filed` state is set from nothing
 * else), so it opens once, when the application is filed, and the done
 * screen with its reference and what happens next is under it when it goes.
 */
export function RegistrationFiledSheet({ reference }: { reference: string }) {
  const copy = useClientCopy().success;
  const [open, setOpen] = useState(true);
  const words = successCopy(copy, "registrationFiled", { reference });
  return (
    <SuccessSheet
      open={open}
      onOpenChange={setOpen}
      variant={words.variant}
      title={words.title}
      body={words.body}
      details={[{ label: copy.detail.reference, value: reference, mono: true }]}
      primary={{ label: copy.continue }}
    />
  );
}
