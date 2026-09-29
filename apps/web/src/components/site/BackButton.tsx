"use client";

import { BackControl, type BackSurface } from "@/components/ui/BackControl";

/**
 * The back control for bars that are not a `PageHeader`: the console, the
 * workspaces, the auth screens, the public site, and a handful of page tops.
 *
 * It is `BackControl` and nothing else, kept under this name because thirteen
 * call sites and three tests know it by it. The behaviour, the size, the glyph
 * and the accessible name all live in `components/ui/BackControl.tsx`; where
 * the press goes lives in `lib/nav/resolve.ts` (`docs/BACK_NAVIGATION.md`).
 */
export function BackButton({
  fallback = "/home",
  label,
  className,
  surface = "bare",
}: {
  fallback?: string;
  /** Omit it: the control names its destination ("Back to Messages"). */
  label?: string;
  className?: string;
  surface?: BackSurface;
}) {
  return (
    <BackControl
      fallback={fallback}
      surface={surface}
      {...(label ? { label } : {})}
      {...(className ? { className } : {})}
    />
  );
}
