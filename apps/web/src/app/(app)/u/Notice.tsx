import { EmptyState } from "@/components/app/Screen";
import { EmptyActions } from "@/components/app/EmptyActions";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * ONE EMPTY-STATE ANATOMY ACROSS `/around` AND `/u`.
 *
 * The two screens are one tap apart and they drew the same kind of message two
 * different ways. `/around` renders `EmptyPanel`, which is a thin wrapper over
 * the platform's `EmptyState`: no container, an 80px object on the ground, the
 * heading at section size, the body at ordinary copy, and the actions stacked
 * and full width through `EmptyActions`. `/u` rendered `ProfileNotice`, which
 * is an `.nf-card` wrapped round a 48px object with the body a tier smaller.
 *
 * `Screen.tsx` names that difference as the exact fault it was written to end:
 * "NO CONTAINER. The object and the words sit on the ground. Two of the three
 * shapes this replaces wrapped themselves in an `.nf-card`, putting a bordered
 * box around a message whose whole job is to say the box is empty." A person
 * moving from the feed to a profile met the banned shape and the sanctioned one
 * within a single navigation.
 *
 * So this is the prop shape `/u`'s call sites already pass, rendering the
 * platform anatomy. It is an adapter, not a second design: every pixel below is
 * decided by `EmptyState` and `EmptyActions`, which is the point.
 *
 * WHAT IS STILL OUTSIDE THIS SCOPE. `ProfileNotice` itself lives in
 * `components/social/profile/`, and `SocialPaused`, `FollowListPage` and
 * `/stories/new` still render it. None of those is this owner's file, so the
 * component stays where it is and keeps working; the three `/u` screens are the
 * ones the finding names and the ones changed here. Folding the remaining
 * callers in and deleting `ProfileNotice` is one small sweep for whoever owns
 * `components/social/**`, and it is written up rather than reached into.
 */
export function Notice({
  icon,
  title,
  body,
  primary,
  secondary,
}: {
  icon: BrandIconName;
  title: string;
  body: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      body={body}
      /* `primary` gates the pair, exactly as `ProfileNotice` does: a lone
         secondary would render a quiet ghost button as a screen's only way
         onward, which reads as the thing you are not meant to press. */
      action={
        primary ? <EmptyActions primary={primary} {...(secondary ? { secondary } : {})} /> : undefined
      }
    />
  );
}
