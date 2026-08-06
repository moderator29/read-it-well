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
 *
 * `labelled` puts the word on the button instead of only in its accessible
 * name. On a profile banner that is the right trade: it is the one control a
 * stranger has to guess at, it is the one they reach for most, and a chevron
 * alone over an unknown photograph is a shape rather than an instruction. The
 * bare round form stays for the story viewer, where the picture IS the page and
 * a pill would sit on top of somebody's face, and for the district header,
 * which carries the place's name in a row of its own already.
 */
export function BackChevron({
  fallback,
  label = "Back",
  labelled = false,
}: {
  fallback: string;
  label?: string;
  /** Draw the word beside the chevron, as a pill. */
  labelled?: boolean;
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
    <button
      type="button"
      /* When the word is on the button the accessible name comes from the word
         itself. Repeating it in `aria-label` would be harmless but redundant;
         omitting it keeps the visible label and the announced one the same
         string by construction rather than by two people remembering. */
      aria-label={labelled ? undefined : label}
      onClick={back}
      className={labelled ? "nf-social-round nf-social-round--pill" : "nf-social-round"}
      data-testid="profile-back"
    >
      <UiIcon name="arrow-left" size={20} />
      {labelled ? <span>{label}</span> : null}
    </button>
  );
}
