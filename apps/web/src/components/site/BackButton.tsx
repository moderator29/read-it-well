"use client";

import { UiIcon } from "@/design-system/icons/UiIcon";
import { useBack } from "@/lib/nav/use-back";
import { useClientCopy } from "@/lib/i18n/client-copy";

/**
 * Universal back control.
 *
 * A round glass icon button in the platform material, the same object on every
 * sub-page so the way back is always in the same place, like a native app.
 * Goes to this route's DECLARED PARENT, from `lib/nav/route-parents.ts`,
 * however the person arrived.
 *
 * THIS IS THE CONTROL IN THE ADMIN CONSOLE'S HEADER, and the founder's first
 * example of the defect was pressing it and landing on the login page. It asked
 * `canGoBackInApp()` and then called `router.back()`. Anybody who reached
 * `/admin` through a sign-in bounce had `/sign-in` as their previous entry, and
 * that answer was in-app, so back went there. The fix is not a better guess
 * about history; it is that `/admin`'s parent is declared and this control goes
 * there. `lib/nav/resolve.ts` carries the reasoning, and `useBack` still uses
 * history when the previous entry can be PROVED to be the parent.
 */
export function BackButton({
  fallback = "/home",
  label,
  className,
}: {
  fallback?: string;
  /**
   * Accessible name. Optional: a caller that already holds a `t` from its
   * server parent still wins, and otherwise the client dictionary answers
   * with `common.back` rather than leaving one English word on the screen.
   */
  label?: string;
  className?: string;
}) {
  /* No server parent to thread `t` from, on any of the pages that use this.
     See `lib/i18n/use-client-dictionary.ts` for why that is allowed here and
     why it must not spread. */
  const t = useClientCopy();
  const back = useBack(fallback);
  return (
    <button
      type="button"
      aria-label={label ?? t.common.back}
      onClick={back}
      /*
        THE WALKER'S HANDLE, AND WHY IT IS AN ATTRIBUTE RATHER THAN A CLASS.

        `scripts/design/proof-nav.mjs` opens every route that declares a parent
        and has to answer two questions a grep cannot: did a back control
        actually DRAW, and where did pressing it LAND. Matching on a class name
        would tie the proof to this component's paint, which changes; matching
        on the accessible name would tie it to whichever language the cookie
        asked for. This attribute says what the object IS, so the same selector
        finds the one in `PageHeader` too.
      */
      data-nav-back=""
      /*
        NO CONTAINER. `nf-icon-btn` draws a bordered glass plate, so every
        screen with a back arrow opened with a boxed object in the top left
        competing with the title beside it - and this one component is the back
        control on the admin console, the agent shell and every page header.
        The arrow is the most recognised control in software and needs nothing
        drawn around it to be found.

        `nf-tap` keeps the 44pt hit region the plate used to imply, so what
        goes is the paint and not the target.
      */
      className={`nf-tap grid place-items-center rounded-[var(--nf-radius-control)] text-[var(--nf-content-primary)] transition-colors hover:text-[var(--nf-brand-secondary)] ${className ?? ""}`}
    >
      <UiIcon name="arrow-left" size={20} />
    </button>
  );
}
