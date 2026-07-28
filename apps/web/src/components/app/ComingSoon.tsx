import { Icon, type IconName } from "@/design-system/icons/Icon";

/**
 * Placeholder for consumer destinations not yet built.
 *
 * The rail and tab bar list a fixed set of destinations that must all resolve
 * rather than dead-end in a 404 (Master Rule 55). This states plainly that the
 * section is on the way while the shell keeps the navigation in place around
 * it, so the whole app stays explorable.
 */
export function ComingSoon({ title, icon }: { title: string; icon: IconName }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <Icon name={icon} size={72} className="mx-auto" />
      <h1 className="nf-h2 mt-5">{title}</h1>
      <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
        This part of your workspace is being built. The navigation is final, so this
        destination is reserved and will fill in shortly.
      </p>
    </div>
  );
}
