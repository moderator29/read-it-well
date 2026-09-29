"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { SuccessSheet } from "@/components/ui/SuccessSheet";
import {
  DONE_FLAGS,
  DONE_PARAM,
  GLOBAL_DONE_FLAGS,
  SUCCESS_EVENT,
  successCopy,
  withoutDone,
  type DoneFlag,
  type SuccessEventDetail,
} from "@/lib/ui/success-moments";

/**
 * THE ACCOUNT MOMENTS, WHEREVER THEY LAND. Mounted once, in the root layout.
 *
 * A sign-up, a confirmed email, a changed password and a passcode belong to
 * the account rather than to a record on a page, and each finishes wherever
 * the person was going. So they are shown here, from either of two signals:
 *
 *   - `?done=<flag>` on any address, for a flow that ends in a redirect
 *     (`lib/auth/actions.ts` sends a changed password to `/home?done=...`).
 *     Stripped with `router.replace` as the sheet opens.
 *   - `showSuccess(flag)` from `lib/ui/success-moments.ts`, for a screen that
 *     stays where it is (the passcode setup).
 *
 * ONLY `GLOBAL_DONE_FLAGS`. A record's moment ("agreement drawn up") is
 * shown by its own page, which can check the record; this host checks
 * nothing and so accepts nothing that needs checking.
 */
export function SuccessFlagHost() {
  const copy = useClientCopy().success;
  const pathname = usePathname();
  const router = useRouter();
  const [flag, setFlag] = useState<DoneFlag | null>(null);

  /* The address, read on every client navigation. `usePathname` rather than
     `useSearchParams`, which would need a Suspense boundary round the whole
     root layout; the query is read from `window.location` inside the effect. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const asked = params.get(DONE_PARAM);
    const found = GLOBAL_DONE_FLAGS.find((f) => f === asked);
    if (!found) return;
    const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    router.replace(withoutDone(here), { scroll: false });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlag(found);
  }, [pathname, router]);

  useEffect(() => {
    const onSuccess = (event: Event) => {
      const asked = (event as CustomEvent<SuccessEventDetail>).detail?.flag;
      if (asked && GLOBAL_DONE_FLAGS.includes(asked)) setFlag(asked);
    };
    window.addEventListener(SUCCESS_EVENT, onSuccess);
    return () => window.removeEventListener(SUCCESS_EVENT, onSuccess);
  }, []);

  if (!flag) return null;
  const words = successCopy(copy, DONE_FLAGS[flag]);
  return (
    <SuccessSheet
      open
      onOpenChange={(open) => {
        if (!open) setFlag(null);
      }}
      variant={words.variant}
      title={words.title}
      body={words.body}
      primary={{ label: copy.continue }}
      testId="success-sheet-account"
    />
  );
}
