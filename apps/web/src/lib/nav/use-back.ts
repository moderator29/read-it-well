"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canGoBackInApp } from "@/lib/ui/history";
import { chooseBack, parentOf } from "./resolve";
import { previousEntryPath } from "./previous-entry";

/**
 * The one back control behaviour, for every drawn back control on the platform.
 *
 * `PageHeader`, `BackButton`, `BackChevron`, the listing gallery's floating
 * chevron, the assistant and the message thread all call this and nothing else.
 * None of them calls `router.back()` any more, because none of them is in a
 * position to know whether the browser's previous entry is this screen's
 * parent, and every one of them used to assume it was.
 *
 * `fallback` is NOT the ordinary path any more, and callers that still pass one
 * are not wrong to. It is now reached in exactly two situations: a route with
 * no entry in `route-parents.ts`, and a root, which should not be drawing a
 * back control in the first place. A route with a declared parent ignores it,
 * which is the point: the parent is a property of the screen, not of whichever
 * component happened to render its header.
 */
export function useBack(fallback = "/home"): () => void {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    const path = pathname ?? "/";
    const decision = chooseBack({
      path,
      fallback,
      previousPath: previousEntryPath(),
      previousIsInApp: canGoBackInApp(),
      surface: "web",
    });

    if (decision.reason === "no-parent-declared" && process.env.NODE_ENV !== "production") {
      /* Loud on purpose. A route with no declared parent is a hole in
         `lib/nav/route-parents.ts`, and the whole reason that file exists is
         that a silently defaulted parent is indistinguishable from a correct
         one until somebody presses back in front of a customer. */
      console.warn(
        `[nav] "${path}" has no declared parent. Add it to lib/nav/route-parents.ts. ` +
          `Falling back to "${decision.href}".`,
      );
    }

    if (decision.action === "back") router.back();
    else if (decision.action === "push") router.push(decision.href);
  }, [router, pathname, fallback]);
}

/**
 * Where this screen's back control leads, as an href.
 *
 * For anything that wants to DRAW the destination (a `<Link>`, a hover target,
 * a middle-click that opens the parent in a new tab) rather than run the
 * decision. It deliberately never reports history: history is an optimisation
 * on top of this answer, never a different answer.
 */
export function useBackHref(fallback = "/home"): string {
  const pathname = usePathname();
  const target = parentOf(pathname ?? "/");
  return target.kind === "parent" ? target.href : fallback;
}
