import Image from "next/image";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Scene banner.
 *
 * A compact in-platform panel built on one commissioned scene: the artwork
 * on its own lit stage beside a short line of copy and an action. Used on
 * app surfaces where a promise needs a face (an empty result set, the
 * wallet trust strip, the assistant invitation) without stealing the room a
 * full landing showcase would take.
 *
 * The stage tone matches the ground the scene was rendered on, so the
 * artwork never shows a seam in either theme.
 */
export function SceneBanner({
  art,
  alt,
  stage = "night",
  title,
  body,
  href,
  action,
  className,
}: {
  art: string;
  alt: string;
  stage?: "paper" | "night";
  title: string;
  body: string;
  href: string;
  action: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`nf-card nf-card--interactive group flex items-center gap-4 overflow-hidden p-0 pr-4 sm:gap-5 sm:pr-6 ${className ?? ""}`}
    >
      <span
        className={`nf-scene-chip nf-story-stage--${stage} m-3 flex h-[92px] w-[92px] shrink-0 items-center justify-center p-2 sm:m-4 sm:h-[112px] sm:w-[112px] sm:p-2.5`}
      >
        <Image
          src={art}
          alt={alt}
          width={900}
          height={900}
          sizes="128px"
          className="nf-story-art h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </span>

      <span className="min-w-0 py-4">
        <span className="block text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
          {title}
        </span>
        <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {body}
        </span>
        <span className="mt-2.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-electric-300)]">
          {action}
          <UiIcon
            name="arrow-right"
            size={16}
            className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </span>
    </Link>
  );
}
