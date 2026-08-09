import type { ReactNode } from "react";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Reveal } from "@/components/site/Reveal";
import { PageHeader } from "./PageHeader";

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
  icon: BrandIconName;
  /** One line on what this destination will do once it ships. */
  promise: string;
  /** A small mocked-up slice of the future surface, badged as a preview. */
  preview?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={title} />
      <div className="py-4 text-center sm:py-6">
      <Reveal>
        {/*
          NO TILE, and this was the last opt-in on the platform.

          The old comment argued that a chip "stops a lone icon floating in the
          middle of an empty page". That is a real problem and a plate is the
          wrong answer to it: what stops an object floating is SIZE and the air
          around it, not a box. So the object is bigger and sits on the page.
        */}
        <span className="nf-story-art mx-auto block h-28 w-28 sm:h-32 sm:w-32">
          <BrandIcon name={icon} fill />
        </span>
        <p className="mx-auto mt-2.5 max-w-[44ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {promise}
        </p>
      </Reveal>

      {preview && (
        <Reveal delay={110} className="mt-8 text-left">
          <div className="nf-card relative overflow-hidden p-5 pt-6">
            {preview}
          </div>
        </Reveal>
      )}
      </div>
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
