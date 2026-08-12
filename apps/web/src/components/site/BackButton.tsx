"use client";

import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { canGoBackInApp } from "@/lib/ui/history";
import { useClientDictionary } from "@/lib/i18n/use-client-dictionary";

/**
 * Universal back control.
 *
 * A round glass icon button in the platform material, the same object on every
 * sub-page so the way back is always in the same place, like a native app.
 * Goes back through history when there is somewhere in THIS app to go back to;
 * otherwise falls through to `fallback`, so a deep link straight into a
 * sub-page never strands the user.
 *
 * The test is `canGoBackInApp()`, shared with `PageHeader` and
 * `ListingGallery`. It has now been wrong in both directions and the reasoning
 * for each is in `lib/ui/history.ts`, worth reading before touching this:
 * `history.length > 1` counted entries belonging to whatever site the visitor
 * came from and landed a fresh tab on `about:blank`; `history.state.idx`
 * replaced it and then stopped existing in Next 16, so this control pushed its
 * fallback on every screen and threw away whatever the person was in the
 * middle of. Neither failure showed up as an error.
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
  const router = useRouter();
  /* No server parent to thread `t` from, on any of the pages that use this.
     See `lib/i18n/use-client-dictionary.ts` for why that is allowed here and
     why it must not spread. */
  const t = useClientDictionary();
  return (
    <button
      type="button"
      aria-label={label ?? t.common.back}
      onClick={() => {
        if (canGoBackInApp()) router.back();
        else router.push(fallback);
      }}
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
