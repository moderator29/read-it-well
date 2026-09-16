import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";

/**
 * What an empty state offers, in one shape, on every screen that has one.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS.
 *
 * Empty states are the primary state of this product. Zero bookings, zero
 * reviews, zero transactions, zero rows in nineteen operator queues, and a
 * signed-out branch on every in-app route because the middleware cannot reach
 * a session. So the shape of an empty state is not an edge case in this
 * product, it is most of what a person sees.
 *
 * Three of them, on three screens somebody hits in one session, had three
 * different treatments. The wallet offered "Sign in" and a ghost "Explore
 * places", both at intrinsic width, sitting off-centre next to each other.
 * Notifications offered a FULL-WIDTH "Explore places" alone in one branch and
 * a pair in another. Bookings offered a third arrangement. Nothing about the
 * three states differed; only the code did.
 *
 * ONE TREATMENT. Both actions full width, stacked, primary first, quiet
 * second. Full width because at 390px an intrinsic-width button in a centred
 * column reads as a chip somebody forgot to style, and because a thumb aiming
 * at the bottom of a screen wants a target, not a word.
 *
 * ---------------------------------------------------------------------------
 * AND THE SECOND ACTION HAS TO BE RELEVANT.
 *
 * "Explore places" was the alternative offered to somebody who came to look at
 * their own money. That is a non sequitur, and worse, it is the product
 * changing the subject when it cannot answer the question. The quiet action
 * belongs to the screen it is on: on the wallet it explains how the wallet
 * works, on bookings it finds somewhere to stay. Where there honestly is no
 * second thing to do, there is no second button.
 */
export function EmptyActions({
  primary,
  secondary,
}: {
  primary: { label: string; href: string };
  /** Omit where the screen honestly has no relevant second step. */
  secondary?: { label: string; href: string };
}): ReactNode {
  return (
    <div className="flex w-full max-w-sm flex-col gap-row">
      <ButtonLink href={primary.href} variant="primary" full>
        {primary.label}
      </ButtonLink>
      {secondary && (
        <ButtonLink href={secondary.href} variant="ghost" full>
          {secondary.label}
        </ButtonLink>
      )}
    </div>
  );
}
