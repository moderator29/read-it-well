import Link from "next/link";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * A designed state, with a way onward.
 *
 * Every honest outcome on the profile surfaces renders through this: keys not
 * added yet, signed out, a handle that belongs to somebody else, a handle
 * nobody holds. None of them is a blank screen and none of them is a dead end,
 * which is the whole reason it exists as one component rather than four
 * hand-written panels that would drift apart.
 */
export function ProfileNotice({
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
    <section className="nf-card p-6 text-center sm:p-8">
      <div className="mx-auto w-fit">
        <BrandIcon name={icon} size={64} />
      </div>
      <h2 className="nf-h3 mt-4">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {body}
      </p>
      {(primary || secondary) && (
        <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
          {primary && (
            <Link href={primary.href} className="nf-btn nf-btn--primary">
              {primary.label}
              <UiIcon name="arrow-right" size={15} />
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className="nf-btn nf-btn--ghost">
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
