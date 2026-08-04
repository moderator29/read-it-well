"use client";

import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * Page header with the platform back flow.
 *
 * The pattern every big app uses: the back control lives at the top left OF THE
 * PAGE, next to its title, not floating in the global chrome. Back returns to
 * the previous in-app screen when one exists in this session's history
 * (Next.js tracks the index in history.state), and otherwise falls through to
 * `fallback`, so a deep link or fresh tab never strands the user or bounces
 * them out of the product.
 */
export function PageHeader({
  title,
  subtitle,
  fallback = "/home",
  backLabel = "Back",
  actions,
  leading,
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  fallback?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  /** A mark placed before the title, e.g. a verified-state BrandIcon. */
  leading?: React.ReactNode;
  /**
   * "verified" tints the row and settles in once, for a real state change
   * landing on the page (an inspection just confirmed, say) rather than a
   * decorative loop. Default carries no tint.
   */
  tone?: "default" | "verified";
}) {
  const router = useRouter();

  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) router.back();
    else router.push(fallback);
  };

  return (
    <div
      className={`mb-5 flex items-center gap-4 rounded-[var(--nf-radius-lg)] sm:mb-6 ${
        tone === "verified" ? "nf-page-header--verified" : ""
      }`}
    >
      {/* 36px drawn, 44px tappable. The circle stays small because the header
          is a quiet row and a big filled disc would shout over the title, but a
          36px target fails the 44px minimum, so a transparent inset extends the
          hit area without moving a pixel of the design. Same technique as the
          post card's action row. */}
      <button
        type="button"
        aria-label={backLabel}
        onClick={back}
        className="nf-icon-btn relative h-9 w-9 before:absolute before:-inset-1 before:content-[''] sm:h-10 sm:w-10 sm:before:inset-0"
      >
        <UiIcon name="arrow-left" size={17} />
      </button>
      {leading}
      <div className="min-w-0 flex-1">
        {/* Neither of these truncates any more. A header that reads "Places on
            R..." tells somebody nothing and cannot be recovered from, and the
            owner has already caught this once. Two lines is the ceiling: past
            that the words are wrong, not the box. */}
        <h1 className="nf-h2 [overflow-wrap:anywhere] line-clamp-2">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-[var(--nf-content-muted)] [overflow-wrap:anywhere] line-clamp-2">
            {subtitle}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
