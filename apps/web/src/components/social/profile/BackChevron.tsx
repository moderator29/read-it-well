"use client";

import { useBack } from "@/lib/nav/use-back";
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
 * It takes the same route every other back control here does: this screen's
 * DECLARED PARENT, from `lib/nav/route-parents.ts`, however the person arrived.
 * A profile is usually reached from a post, so `/u/[handle]` declares `/around`
 * as its parent and `useBack` returns through history to the exact post when
 * the previous entry can be PROVED to be that parent, which is what keeps the
 * conversation somebody was reading.
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
  /*
   * `fallback` stays in the signature and is now the answer for an undeclared
   * route only. A screen whose parent is declared goes to that parent, and
   * this component is no longer in a position to disagree with the map, which
   * is the whole point of there being one.
   */
  const back = useBack(fallback);

  return (
    <button
      type="button"
      /* When the word is on the button the accessible name comes from the word
         itself. Repeating it in `aria-label` would be harmless but redundant;
         omitting it keeps the visible label and the announced one the same
         string by construction rather than by two people remembering. */
      aria-label={labelled ? undefined : label}
      onClick={back}
      /* THE WALKER'S HANDLE. `scripts/design/proof-nav.mjs` finds every drawn
         back control by this attribute, and this component did not carry it, so
         every screen whose only way back is a chevron read as having none. The
         district header on `/around/[slug]` is one of those, and its own comment
         says the header "carries the product's real back control" while a
         browser walk of that route reported nothing drawn. `data-testid` is not
         a substitute: it names a test's grip on one surface, this names what the
         object is on all of them. */
      data-nav-back=""
      className={labelled ? "nf-social-round nf-social-round--pill nf-btn--glass" : "nf-social-round nf-btn--glass"}
      data-testid="profile-back"
    >
      <UiIcon name="arrow-left" size={20} />
      {labelled ? <span>{label}</span> : null}
    </button>
  );
}
