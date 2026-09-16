import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { EmptyActions } from "@/components/app/EmptyActions";

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
    <section className="nf-card p-lg text-center sm:p-xl">
      <div className="mx-auto w-fit">
        <BrandIcon name={icon} size={48} />
      </div>
      <h2 className="nf-h3 mt-md">{title}</h2>
      <p className="mx-auto mt-xs max-w-sm text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
        {body}
      </p>
      {primary && (
        /*
          ONE ACTION TREATMENT, THE SAME ONE THE REST OF THE PRODUCT USES.
          This was a hand-rolled pair: stacked on a phone, side by side and
          centred from `sm` up, at intrinsic width. That is a fourth arrangement
          of the same two buttons, on screens a tap away from `/around`, which
          uses `EmptyActions`. Stacked, full width, primary then quiet,
          everywhere.

          `primary` gates the whole block now. A lone secondary was reachable in
          the type and would have rendered a quiet ghost button as the only
          thing to do, which reads as the action nobody wanted you to take.
        */
        <div className="mt-5 flex justify-center">
          <EmptyActions primary={primary} {...(secondary ? { secondary } : {})} />
        </div>
      )}
    </section>
  );
}
