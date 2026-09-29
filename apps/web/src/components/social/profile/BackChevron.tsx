"use client";

import { BackControl } from "@/components/ui/BackControl";

/**
 * Back, floating on a cover photograph.
 *
 * The platform's `PageHeader` carries the same behaviour, and this is not a
 * second one: `PageHeader` is a row with a title in it, and a cover has no room
 * for a row. This is only the control, on a scrim so it reads over any
 * photograph, at 44px because it is the primary navigation affordance on the
 * page and 36px was already the smallest target on every social surface.
 *
 * It takes the same route every other back control here does (`BackControl`,
 * `lib/nav/resolve.ts`). A profile is usually reached from a post, and Back
 * now returns to that post: the old rule allowed history only when the entry
 * behind was the declared parent (`/around`), so a profile opened from a post
 * went to the top of the feed and the conversation somebody was reading was
 * lost. Opened cold, it goes to `/around`.
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
  label,
  labelled = false,
}: {
  fallback: string;
  label?: string;
  /** Draw the word beside the chevron, as a pill. */
  labelled?: boolean;
}) {
  /* `fallback` is the answer for an undeclared route only. */
  return (
    <BackControl
      fallback={fallback}
      surface={labelled ? "pill" : "media"}
      {...(label ? { label } : {})}
      data-testid="profile-back"
    />
  );
}
