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
      {/* Tiled: an empty panel has one object and one sentence in it, so the
          object is the subject rather than an ornament beside something. */}
      <div className="mx-auto w-fit">
        <BrandIcon name={icon} size={56} tile />
      </div>
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
