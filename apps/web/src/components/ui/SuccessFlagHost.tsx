"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { consumeSuccess } from "@/lib/ui/success-actions";
import {
  DONE_FLAGS,
  DONE_PARAM,
  SUCCESS_EVENT,
  SUCCESS_HINT_COOKIE,
  isGlobalDoneFlag,
  successCopy,
  type GlobalDoneFlag,
  type SuccessEventDetail,
} from "@/lib/ui/success-moments";

/**
 * THE ACCOUNT MOMENTS, WHEREVER THEY LAND. Mounted once, in the root layout.
 *
 * A sign-up, a confirmed email, a changed password and a passcode belong to
 * the account rather than to a record on a page, and each finishes wherever
 * the person was going. They reach this host two ways, and NEITHER is the
 * address:
 *
 *   - a server action that succeeded calls `rememberSuccess(flag)`, which
 *     sets an HttpOnly one-shot cookie and a readable hint
 *     (lib/ui/success-cookie.ts). On a navigation where the hint is present,
 *     this asks the server (`consumeSuccess`), which answers from the
 *     HttpOnly cookie alone, against the allow-list, and deletes it.
 *   - a client screen that succeeded calls `showSuccess(flag)`.
 *
 * `?done=<account flag>` IS NOT HONOURED. It was forgeable: a link could say
 * "Password changed" to anybody, and it survived a sign-in's `next=`. One
 * found in the address is removed, on every route including the site pages,
 * and nothing opens.
 */
/*
 * THE SHEET LOADS WHEN THERE IS A MOMENT TO SHOW (speed, 6 October 2026).
 * This host is in the root layout, so a static import put the whole sheet
 * (SuccessSheet, SuccessScreen, the clay object through `Icon3D` and with it
 * `next/image`'s client runtime) in the JavaScript every route loads first,
 * for a moment most page loads never have. It is fetched the moment one is
 * known to be coming: the hint cookie is present (in parallel with asking
 * the server for the flag), or a client screen announces one.
 */
const loadSheet = () => import("@/components/ui/SuccessSheet").then((m) => m.SuccessSheet);
const SuccessSheet = dynamic(loadSheet, { ssr: false });

export function SuccessFlagHost() {
  const copy = useClientCopy().success;
  const pathname = usePathname();
  const [flag, setFlag] = useState<GlobalDoneFlag | null>(null);

  useEffect(() => {
    /* A stale or forged account flag in the address goes, silently. The
       history API rather than the router: this changes nothing the page
       renders, so it must not ask the server for anything. */
    const url = new URL(window.location.href);
    if (isGlobalDoneFlag(url.searchParams.get(DONE_PARAM))) {
      url.searchParams.delete(DONE_PARAM);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }

    if (!document.cookie.split("; ").some((part) => part === `${SUCCESS_HINT_COOKIE}=1`)) return;
    /* Fetch the sheet while the server is asked, so the two arrive together. */
    void loadSheet().catch(() => undefined);
    /* Not cancelled on a further navigation: the server has already deleted
       the cookie by the time it answers, so dropping the answer would lose
       the moment for good. */
    void consumeSuccess().then(
      (taken) => {
        if (taken) setFlag(taken);
      },
      () => undefined,
    );
  }, [pathname]);

  useEffect(() => {
    const onSuccess = (event: Event) => {
      const asked = (event as CustomEvent<SuccessEventDetail>).detail?.flag;
      if (isGlobalDoneFlag(asked)) setFlag(asked);
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
      haptic={words.haptic}
      object={words.object}
      title={words.title}
      body={words.body}
      primary={{ label: copy.continue }}
      testId="success-sheet-account"
    />
  );
}
