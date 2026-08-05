"use client";

import { useRouter } from "next/navigation";
import { canGoBackInApp } from "@/lib/ui/history";
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
    /*
     * `history.state.idx` was a Next internal and Next 16 no longer writes it,
     * so this read was always undefined, `?? 0` made it zero, and every tap
     * took the fallback. The browser's own back button kept working, which is
     * why it survived: anybody testing with a keyboard never saw it.
     *
     * `canGoBackInApp` asks the Navigation API first, falls back to our own
     * stamp on `history.state`, then to a same-origin referrer, and fails
     * closed. Every other back control on the platform now uses it.
     */
    if (canGoBackInApp()) router.back();
    else router.push(fallback);
  };

  return (
    <button type="button" aria-label={label} onClick={back} className="nf-social-round">
      <UiIcon name="arrow-left" size={18} />
    </button>
  );
}
