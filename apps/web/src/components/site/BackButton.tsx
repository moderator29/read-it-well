"use client";

import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Universal back control.
 *
 * A round glass icon button in the platform material, the same object on every
 * sub-page so the way back is always in the same place, like a native app.
 * Goes back through history when there is somewhere in THIS app to go back to;
 * otherwise falls through to `fallback`, so a deep link straight into a
 * sub-page never strands the user.
 *
 * The test is `history.state.idx`, which is Next's own index into the entries
 * it has pushed, and it is the same test `PageHeader`, `BackChevron` and
 * `ListingGallery` already use. It used to be `history.length > 1`, which
 * counts every entry the TAB has ever had, including the ones belonging to
 * whatever site the visitor came from. Opening an agent page in a fresh tab
 * therefore called `router.back()` with nothing of ours behind it and landed
 * on `about:blank`: a blank white page and no way home, which is the exact
 * dead end this control exists to prevent. Caught by looking at a screenshot,
 * never by reading the code.
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
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
        if (idx > 0) router.back();
        else router.push(fallback);
      }}
      className={`nf-icon-btn ${className ?? ""}`}
    >
      <UiIcon name="arrow-left" size={18} />
    </button>
  );
}
