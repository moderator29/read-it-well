import Link from "next/link";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { EmptyState } from "@/components/app/Screen";

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
 * looking like a different application bolted onto the side of RentMe: a
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
}: {
  icon: BrandIconName;
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      body={body}
      action={
        action && (
          <Link href={action.href} className="nf-btn nf-btn--primary nf-btn--md">
            {action.label}
          </Link>
        )
      }
    />
  );
}
