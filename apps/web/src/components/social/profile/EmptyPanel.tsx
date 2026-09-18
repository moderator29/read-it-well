import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";

/**
 * A tab with nothing in it, designed.
 *
 * One component for all seven social panels, because seven hand-written empty
 * states drift apart and this codebase has watched that happen. Every one says
 * what would be here, in the second person when it is your own page and the
 * third when it is somebody else's, and offers the one thing that would fill it
 * when there is one.
 *
 * It never says "nothing found" and it never renders a dash. An empty tab is a
 * sentence, not a shrug.
 *
 * ---------------------------------------------------------------------------
 * IT IS NOW THE PLATFORM'S EMPTY STATE, NOT THE SOCIAL LAYER'S.
 *
 * This kept the social layer internally consistent and, in doing so, kept it
 * looking like a different application bolted onto the side of Vallo: a
 * `nf-social-card` wrapper, an 80px object and a 1.05rem heading, against the
 * property side's card wrapper, 64px object and `nf-h3`. Two products, one
 * account.
 *
 * The social layer stays - all of it - and it stops being a separate visual
 * dialect. `EmptyState` is the one shape, so an empty Posts tab and an empty
 * Saved screen are recognisably the same product telling you the same kind of
 * thing. The wrapper card goes with it, which is the general rule: a bordered
 * box around a message whose job is to say the box is empty.
 * ---------------------------------------------------------------------------
 */
export function EmptyPanel({
  icon,
  title,
  body,
  action,
  secondary,
}: {
  icon: BrandIconName;
  title: string;
  body: string;
  action?: { href: string; label: string };
  /**
   * A quiet second way onward, for the states that honestly have one: a paused
   * feature that still lets somebody search, a handle that is not a handle.
   *
   * It arrived with `ProfileNotice`, which this component replaced. That one
   * drew an `.nf-card` around a 48px object, which is the shape `Screen.tsx`
   * was written to end ("a bordered box around a message whose whole job is to
   * say the box is empty"), so the product carried two empty-state anatomies
   * one tap apart. Folding its last three callers in here and deleting it left
   * ONE adapter over ONE anatomy, which is the only arrangement in which a
   * second one cannot quietly come back.
   *
   * `action` gates the pair: a lone secondary would render a quiet ghost button
   * as a screen's only way onward, which reads as the thing you are not meant
   * to press.
   */
  secondary?: { href: string; label: string };
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      body={body}
      /* THE ACTION GOES THROUGH `EmptyActions` LIKE EVERY OTHER ONE. It was a
         hand-rolled `nf-btn` at intrinsic width, which is the third of the
         three treatments F2-073 counted across the product's empty states: at
         390px an intrinsic-width button in a centred column reads as a chip
         somebody forgot to style. One shape, stacked and full width, wherever
         an empty state offers a way onward. */
      action={
        action && <EmptyActions primary={action} {...(secondary ? { secondary } : {})} />
      }
    />
  );
}
