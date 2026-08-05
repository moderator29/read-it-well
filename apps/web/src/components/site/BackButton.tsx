"use client";

import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { canGoBackInApp } from "@/lib/ui/history";

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
  label = "Back",
  className,
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (canGoBackInApp()) router.back();
        else router.push(fallback);
      }}
      className={`nf-icon-btn ${className ?? ""}`}
    >
      <UiIcon name="arrow-left" size={20} />
    </button>
  );
}
