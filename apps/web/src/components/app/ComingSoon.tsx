import type { ReactNode } from "react";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { Reveal } from "@/components/site/Reveal";

/**
 * Placeholder for consumer destinations not yet built.
 *
 * The rail and tab bar list a fixed set of destinations that must all resolve
 * rather than dead-end in a 404 (Master Rule 55). Each destination states in
 * one line what it will do, then shows a small skeleton preview of the surface
 * to come, clearly badged as a preview so nothing here reads as live data.
 */
export function ComingSoon({
  title,
  icon,
  promise,
  preview,
}: {
  title: string;
  icon: IconName;
  /** One line on what this destination will do once it ships. */
  promise: string;
  /** A small mocked-up slice of the future surface, badged as a preview. */
  preview?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl py-10 text-center sm:py-14">
      <Reveal>
        <span className="mx-auto block h-16 w-16 sm:h-20 sm:w-20">
          <Icon name={icon} fill />
        </span>
        <h1 className="nf-h2 mt-5">{title}</h1>
        <p className="mx-auto mt-2.5 max-w-[44ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {promise}
        </p>
      </Reveal>

      {preview && (
        <Reveal delay={110} className="mt-8 text-left">
          <div className="nf-card relative overflow-hidden p-5 pt-6">
            {preview}
          </div>
          <p className="mt-3 text-center text-[0.75rem] text-[var(--nf-content-muted)]">
            A preview of the layout. No live data is shown.
          </p>
        </Reveal>
      )}
    </div>
  );
}

/**
 * Skeleton bar for preview mocks. Purely decorative, hidden from assistive
 * technology, and the pulse is dropped when the user prefers reduced motion.
 */
export function Ske({ className = "" }: { className?: string }) {
  // Default rounding only when the caller has not chosen their own, so a
  // passed `rounded-full` never has to fight `rounded-md` on specificity.
  const rounding = /\brounded/.test(className) ? "" : "rounded-md ";
  return (
    <div
      aria-hidden="true"
      className={`${rounding}bg-[color-mix(in_oklab,var(--nf-content-primary)_9%,transparent)] motion-safe:animate-pulse ${className}`}
    />
  );
}
