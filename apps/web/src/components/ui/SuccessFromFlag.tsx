"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { SuccessSheet, type SuccessAction, type SuccessDetail } from "@/components/ui/SuccessSheet";
import { markSeen, seenOnce } from "@/lib/ui/seen-once";
import { successCopy, withoutDone, type SuccessMomentId } from "@/lib/ui/success-moments";
import type { FeedbackKind } from "@/lib/ui/feedback";

/**
 * A success moment shown ON ARRIVAL, for the flows that end in a navigation.
 *
 * Two ways in, and the page decides which, because only the server knows
 * whether the thing really happened:
 *
 *   `show`        the page read `?done=<flag>` AND checked the record (the
 *                 agreement exists and is yours, the listing is live). The
 *                 flag is stripped with `router.replace` the moment the sheet
 *                 opens, so a refresh or a copied link does not replay it.
 *   `seenKey`     an approval written into a notification by the database,
 *                 where no flag can ride on the link. The page passes `show`
 *                 from the record's status and a key, and the sheet opens once
 *                 per device (lib/ui/seen-once.ts).
 *
 * The open state is LATCHED at mount: `router.replace` re-renders the page
 * without the flag, `show` becomes false, and the sheet stays up until the
 * person closes it.
 */
export function SuccessFromFlag({
  show,
  moment,
  values,
  details,
  primary,
  secondary,
  seenKey,
  strip = [],
  haptic,
}: {
  show: boolean;
  moment: SuccessMomentId;
  values?: Record<string, string>;
  details?: readonly SuccessDetail[];
  /** Defaults to "Continue", which closes. */
  primary?: SuccessAction;
  secondary?: SuccessAction;
  /** Once per device instead of once per flag. */
  seenKey?: string;
  /** Companion query keys that go with the flag (an id it named). */
  strip?: readonly string[];
  haptic?: FeedbackKind | false;
}) {
  const copy = useClientCopy().success;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (decided.current || !show) return;
    decided.current = true;
    if (seenKey) {
      if (seenOnce(seenKey)) return;
      markSeen(seenKey);
    } else {
      const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const clean = withoutDone(here, strip);
      if (clean !== here) router.replace(clean, { scroll: false });
    }
    /* A mount-time latch from a prop the server decided, set once. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [show, seenKey, strip, router]);

  const words = successCopy(copy, moment, values);
  return (
    <SuccessSheet
      open={open}
      onOpenChange={setOpen}
      variant={words.variant}
      title={words.title}
      body={words.body}
      details={details}
      primary={primary ?? { label: copy.continue }}
      secondary={secondary}
      haptic={haptic}
    />
  );
}
