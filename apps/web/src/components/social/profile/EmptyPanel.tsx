import Link from "next/link";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * A tab with nothing in it, designed.
 *
 * One component for all seven panels, because seven hand-written empty states
 * drift apart and this codebase has watched that happen. Every one says what
 * would be here, in the second person when it is your own page and the third
 * when it is somebody else's, and offers the one thing that would fill it when
 * there is one.
 *
 * It never says "nothing found" and it never renders a dash. An empty tab is a
 * sentence, not a shrug.
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
    <div className="nf-card nf-social-card p-7 text-center sm:p-9">
      {/*
        NO TILE. This was one of the last two `tile` opt-ins on the platform and
        it is gone with them.

        The argument for it was that an empty panel has one object in it, so the
        object should be the subject - which is true, and a glass chip drawn
        around it does not make it the subject, it makes it a chip. The object
        is commissioned artwork with its own light and its own shadow; a plate
        behind it flattens exactly the depth it was drawn to have. It sits
        directly on the panel now, larger, which is what actually makes it the
        subject.
      */}
      <span className="nf-story-art mx-auto block h-20 w-20">
        <BrandIcon name={icon} fill />
      </span>
      <h3 className="nf-h3 mt-4 text-[1.05rem]">{title}</h3>
      <p className="mx-auto mt-2.5 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {body}
      </p>
      {action ? (
        <div className="mt-6">
          <Link href={action.href} className="nf-btn nf-btn--primary">
            {action.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
