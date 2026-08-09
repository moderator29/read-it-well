"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { canGoBackInApp } from "@/lib/ui/history";
import { useClientDictionary } from "@/lib/i18n/use-client-dictionary";

/**
 * Page header with the platform back flow.
 *
 * The pattern every big app uses: the back control lives at the top left OF THE
 * PAGE, next to its title, not floating in the global chrome. Back returns to
 * the previous in-app screen when one exists in this session's history, and
 * otherwise falls through to `fallback`, so a deep link or fresh tab never
 * strands the user or bounces them out of the product.
 *
 * The test used to read `history.state.idx`, a Next internal that Next 16 no
 * longer writes, so it was `undefined` on every screen and this control pushed
 * the fallback every single time. A filtered search opened a listing and Back
 * threw the whole hunt away. `lib/ui/history.ts` carries the full account.
 */
export function PageHeader({
  title,
  subtitle,
  subtitleHref,
  fallback = "/home",
  backLabel,
  actions,
  leading,
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  /**
   * Makes the subtitle a link.
   *
   * Added for the message thread, where the subtitle is the PROPERTY the
   * conversation is about. It was already the right piece of context to put
   * there, and it was inert: the only route back to the property was an info
   * button in the corner that opens a sheet. Somebody halfway through
   * negotiating a flat should be one tap from the flat, so when a caller knows
   * where the subtitle points, it points there.
   */
  subtitleHref?: string;
  fallback?: string;
  /**
   * Accessible name for the back control. Optional: a caller holding a real
   * `t` from a server component still wins, and when nobody passes one the
   * client dictionary supplies `common.back` in the reader's language.
   */
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
  /* The back control is the only thing on this header the component names
     itself, and it appears on every app screen. It reads the locale cookie
     directly because there is no server parent to hand it a dictionary and
     there are ~50 call sites; see the hook for why that is a last resort. */
  const t = useClientDictionary();
  const label = backLabel ?? t.common.back;

  const back = () => {
    if (canGoBackInApp()) router.back();
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
        aria-label={label}
        onClick={back}
        className="nf-icon-btn relative h-9 w-9 before:absolute before:-inset-1 before:content-[''] sm:h-10 sm:w-10 sm:before:inset-0"
      >
        <UiIcon name="arrow-left" size={16} />
      </button>
      {leading}
      <div className="min-w-0 flex-1">
        {/* Neither of these truncates any more. A header that reads "Places on
            R..." tells somebody nothing and cannot be recovered from, and the
            owner has already caught this once. Two lines is the ceiling: past
            that the words are wrong, not the box. */}
        <h1 className="nf-h2 [overflow-wrap:anywhere] line-clamp-2">{title}</h1>
        {subtitle &&
          (subtitleHref ? (
            <Link
              href={subtitleHref}
              className="mt-0.5 flex items-center gap-1 text-[0.875rem] font-medium leading-snug text-[var(--nf-content-link)] underline-offset-4 [overflow-wrap:anywhere] line-clamp-2 hover:underline"
            >
              <span className="min-w-0 truncate">{subtitle}</span>
              <UiIcon name="chevron-right" size={16} className="shrink-0" />
            </Link>
          ) : (
            <p className="mt-0.5 text-[0.875rem] leading-snug text-[var(--nf-content-muted)] [overflow-wrap:anywhere] line-clamp-2">
              {subtitle}
            </p>
          ))}
      </div>
      {actions}
    </div>
  );
}
