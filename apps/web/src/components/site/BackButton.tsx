"use client";

import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Universal back control.
 *
 * A round glass icon button in the platform material, the same object on every
 * sub-page so the way back is always in the same place, like a native app.
 * Goes back through history when there is somewhere to go back to; otherwise
 * falls through to `fallback`, so a deep link straight into a sub-page never
 * strands the user.
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
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className={`nf-icon-btn ${className ?? ""}`}
    >
      <UiIcon name="arrow-left" size={18} />
    </button>
  );
}
