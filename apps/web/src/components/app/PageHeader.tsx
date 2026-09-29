"use client";

import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { BackControl } from "@/components/ui/BackControl";

/**
 * Page header with the platform back flow.
 *
 * The pattern every big app uses: the back control lives at the top left OF THE
 * PAGE, next to its title, not floating in the global chrome. The control is
 * the shared `BackControl` (glass surface): it returns to the screen the person
 * came from when that is safe, and otherwise to this route's declared parent
 * (`lib/nav/resolve.ts`, `docs/BACK_NAVIGATION.md`).
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
  layout = "inline",
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
   * Accessible name for the back control. Omit it: the control names its
   * destination ("Back to Messages") for an English reader and says
   * `common.back` in the reader's language otherwise.
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
  /**
   * `inline` is the header every screen draws: back square, title, actions on
   * one row. `stacked` is the renders' page top (Settings, Admin Queue): the
   * back square and the actions on their own row, then the title at `nf-h1`
   * with the subtitle as a lede beneath it. Same back flow, same names.
   */
  layout?: "inline" | "stacked";
}) {
  /* The glass square the renders draw, 44px, named for where it goes. */
  const backButton = (
    <BackControl fallback={fallback} surface="glass" {...(backLabel ? { label: backLabel } : {})} />
  );

  if (layout === "stacked") {
    return (
      <div className={`mb-heading ${tone === "verified" ? "nf-page-header--verified rounded-[var(--nf-radius-lg)]" : ""}`}>
        <div className="flex items-center justify-between gap-md">
          {backButton}
          {actions ? <div className="flex shrink-0 items-center gap-inline">{actions}</div> : null}
        </div>
        <div className="mt-group flex items-start gap-md">
          {leading}
          <div className="min-w-0 flex-1">
            <h1 className="nf-h1 nf-page-title text-[var(--nf-content-primary)] [overflow-wrap:anywhere]">{title}</h1>
            {subtitle &&
              (subtitleHref ? (
                <Link
                  href={subtitleHref}
                  className="nf-lede mt-inline flex items-center gap-inline-tight text-[var(--nf-content-link)] underline-offset-4 [overflow-wrap:anywhere] hover:underline"
                >
                  <span className="min-w-0">{subtitle}</span>
                  <UiIcon name="chevron-right" size={ICON.inline} className="shrink-0" />
                </Link>
              ) : (
                /* The lede in the brand's quiet ink, which is how both renders
                   set the line under the title. */
                <p className="nf-lede mt-inline text-[var(--nf-brand-secondary)] [overflow-wrap:anywhere]">
                  {subtitle}
                </p>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      /* WRAPS RATHER THAN BREAKS A WORD. At 360 the back square, a title
         and a text action ("Mark all read") left the title about 115px, and
         "Notifications" broke as "Notificatio / ns". The title now keeps a
         basis wide enough for a whole word at `nf-h2`, and when the row
         cannot hold that beside the actions, the actions take their own
         line at the end instead. An icon action still fits on the row. */
      className={`mb-heading flex flex-wrap items-center gap-x-md gap-y-inline rounded-[var(--nf-radius-lg)] ${
        tone === "verified" ? "nf-page-header--verified" : ""
      }`}
    >
      {/*
        44px drawn, on every screen size.

        This used to be 36px drawn with a transparent inset faking the target,
        on the argument that a big filled disc would shout over the title. That
        held while the title was smaller. It is `nf-h2` and the body around it
        is 16px now, and a 36px circle holding a 16px glyph beside a heading
        that size reads as the control having been forgotten rather than kept
        quiet. `nf-icon-btn` is a glass square, not a filled disc, so drawing it
        at the real target size costs nothing in loudness and removes the
        pseudo-element that was standing in for it.
      */}
      {backButton}
      {leading}
      <div className="min-w-0 flex-1 basis-[11rem]">
        {/*
          NEITHER OF THESE TRUNCATES, AND THE COMMENT THAT SAID SO WAS WRONG.
          A header that reads "Places on R..." tells somebody nothing and cannot
          be recovered from, and the owner has already caught this once. The
          previous pass wrote that sentence and then left `line-clamp-2` on the
          title and a hard `truncate` on the subtitle, so the title still clipped
          at two lines and the subtitle still clipped at one - the exact two
          things F2-048 names, under a comment claiming they were gone. A
          comment that asserts a fix is the easiest place in a codebase for one
          to hide.

          `[overflow-wrap:anywhere]` is what actually keeps a long word inside
          the column; the clamp was never what stopped an overflow, only what
          hid it. A title long enough to wrap three times is a copy problem, and
          a copy problem you can read is better than one you cannot.
        */}
        <h1 className="nf-h2 [overflow-wrap:anywhere]">{title}</h1>
        {subtitle &&
          (subtitleHref ? (
            <Link
              href={subtitleHref}
              className="nf-body-sm mt-inline-tight flex items-center gap-inline-tight font-medium leading-snug text-[var(--nf-content-link)] underline-offset-4 [overflow-wrap:anywhere] hover:underline"
            >
              {/* `min-w-0` stays so the flex child can shrink; `truncate` goes,
                  because it was clipping the subtitle to one line inside a
                  parent the previous pass had already clamped to two. */}
              <span className="min-w-0">{subtitle}</span>
              <UiIcon name="chevron-right" size={ICON.inline} className="shrink-0" />
            </Link>
          ) : (
            <p className="nf-body-sm mt-inline-tight leading-snug text-[var(--nf-content-muted)] [overflow-wrap:anywhere]">
              {subtitle}
            </p>
          ))}
      </div>
      {actions ? <div className="ms-auto flex shrink-0 items-center gap-inline">{actions}</div> : null}
    </div>
  );
}
