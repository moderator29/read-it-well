"use client";

import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Back, floating on a cover photograph.
 *
 * The platform's `PageHeader` carries the same behaviour, and this is not a
 * second one: `PageHeader` is a row with a title in it, and a cover has no room
 * for a row. This is only the control, on a scrim so it reads over any
 * photograph, at 44px because it is the primary navigation affordance on the
 * page and 36px was already the smallest target on every social surface.
 *
 * It follows real history exactly as every other back control here does. Real
 * history matters more on a profile than anywhere else, because a profile is
 * usually arrived at from a post, and pushing a fallback route would quietly
 * throw away the conversation somebody was reading.
 */
export function BackChevron({
  fallback,
  label = "Back",
}: {
  fallback: string;
  label?: string;
}) {
  const router = useRouter();

  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) router.back();
    else router.push(fallback);
  };

  return (
    <button type="button" aria-label={label} onClick={back} className="nf-social-round">
      <UiIcon name="arrow-left" size={18} />
    </button>
  );
}
