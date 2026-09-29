import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, MouseEventHandler, ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * THE SLATE SYSTEM: the pieces every door into Vallo is built from.
 *
 * To the references of 29 September (`docs/design/references/2026-09-29`,
 * 12 and 14): a full-bleed top block whose bottom edge is one wide concave
 * arc, the wordmark in spaced capitals inside it with a line under it, and
 * below the arc a big title, labelled fields drawn as soft full-width cards,
 * a full-width pill, an "Or" rule and round provider buttons.
 *
 * THE FOUNDER'S THEME RULE, and every colour below follows it through the
 * `--nf-slate-*` roles in `app/css/auth.css`:
 *
 *   light  what is black in the reference is the BRAND: the top block, the
 *          pill and the focus outline run deep navy to the neon brand blue;
 *          the page is white and the field cards are white on a pale ground.
 *   dark   inverted: the top block is a light surface with a navy wordmark,
 *          the pill is white with navy text, the focus outline is white, and
 *          the page and the cards are dark navy.
 *
 * So the top block carries the artwork for the ground it is on, not for the
 * document: the NIGHT mark on the navy block in light mode, the DAY mark on
 * the paper block in dark mode. Both images are in the markup and the
 * stylesheet shows one; they are pictures only, and the name is on the link.
 *
 * Exported for the other doors (the passcode "Welcome back" screen shares
 * them). Nothing here holds state, so every piece renders on the server.
 * Everything visual lives in `app/css/auth.css` under "THE SLATE SYSTEM";
 * the pieces only need to sit inside an element with the `nf-auth` class,
 * or carry `nf-slate` themselves, for the roles to resolve.
 */

/* The block's bottom edge, in a 390 x 260 box stretched to any width. The
   arc falls from the left edge, bottoms out a little left of centre and
   sweeps up to meet the right edge high, as the reference draws it. The
   morph (auth.css, `nf-slate-morph`) starts from a shallower arc. */
export const SLATE_CURVE_PATH = "M0 0H390V64C354 168 262 256 150 256C88 256 38 236 0 206Z";
const SLATE_EDGE_PATH = "M390 64C354 168 262 256 150 256C88 256 38 236 0 206";

/**
 * The top block. `start` and `end` are the toolbar cells (the way back, the
 * language control); `line` is the sentence under the wordmark.
 *
 * `compact` draws the short version, for a screen whose content is the whole
 * point (the passcode keypad). The block also shortens itself on any auth
 * screen while a field has focus, so the primary button stays above the
 * keyboard (auth.css, "THE KEYBOARD").
 */
export function AuthCurveBlock({
  line,
  start,
  end,
  brandHref = "/",
  brandLabel,
  compact = false,
  id,
}: {
  line?: ReactNode;
  start?: ReactNode;
  end?: ReactNode;
  /** Where the wordmark goes. Null draws it as plain text, not a link. */
  brandHref?: string | null;
  /** The link's accessible name, from the dictionary (`a11y.logoHome`). */
  brandLabel: string;
  compact?: boolean;
  id?: string;
}) {
  const word = (
    <>
      <Image
        src="/brand/vallo-mark.png"
        alt=""
        aria-hidden
        width={614}
        height={587}
        sizes="32px"
        priority
        className="nf-slate-top__mark nf-slate-top__mark--on-navy"
      />
      <Image
        src="/brand/vallo-mark-light.png"
        alt=""
        aria-hidden
        width={614}
        height={587}
        sizes="32px"
        priority
        className="nf-slate-top__mark nf-slate-top__mark--on-paper"
      />
      <span className="nf-slate-top__word" aria-hidden="true">
        VALLO
      </span>
    </>
  );

  return (
    <header id={id} className={compact ? "nf-slate-top nf-slate-top--compact" : "nf-slate-top"}>
      <svg
        className="nf-slate-top__ground"
        viewBox="0 0 390 260"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="nf-slate-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="nf-slate-top__stop-a" />
            <stop offset="0.55" className="nf-slate-top__stop-b" />
            <stop offset="1" className="nf-slate-top__stop-c" />
          </linearGradient>
        </defs>
        <path className="nf-slate-top__shape" d={SLATE_CURVE_PATH} fill="url(#nf-slate-fill)" />
        <path className="nf-slate-top__edge" d={SLATE_EDGE_PATH} fill="none" />
      </svg>

      <div className="nf-slate-top__inner">
        <div className="nf-slate-top__bar">
          <div className="nf-slate-top__start">{start}</div>
          <div className="nf-slate-top__end">{end}</div>
        </div>
        {brandHref ? (
          <Link href={brandHref} aria-label={brandLabel} className="nf-slate-top__brand">
            {word}
          </Link>
        ) : (
          <span role="img" aria-label={brandLabel} className="nf-slate-top__brand">
            {word}
          </span>
        )}
        {line ? <p className="nf-slate-top__line">{line}</p> : null}
      </div>
    </header>
  );
}

/**
 * A labelled field drawn as a soft full-width card, for a screen that is not
 * one of the auth forms (those use `fields.tsx`, which the same stylesheet
 * paints identically). 16px type, so iOS never zooms the page.
 */
export function AuthFieldCard({
  id,
  label,
  error,
  trailing,
  className,
  ...input
}: Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  error?: string | undefined;
  /** A control inside the card's right edge, such as a show/hide toggle. */
  trailing?: ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="nf-slate-field">
      <label htmlFor={id} className="nf-slate-field__label">
        {label}
      </label>
      <div className="nf-slate-field__box">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`nf-slate-input${trailing ? " nf-slate-input--trailing" : ""}${className ? ` ${className}` : ""}`}
          {...input}
        />
        {trailing ? <span className="nf-slate-field__trailing">{trailing}</span> : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="nf-slate-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The full-width pill: the one primary action on a door. The shared `Button`
 * (spinner, haptics, press) in the Slate dress, so a pending submit keeps its
 * width and says so.
 */
export function AuthPillButton({
  className,
  quiet = false,
  ...props
}: Omit<ComponentProps<typeof Button>, "variant" | "size" | "full"> & {
  /** The secondary pill: an outline in the page's ink, for a second way on. */
  quiet?: boolean;
}) {
  return (
    <Button
      variant={quiet ? "ghost" : "primary"}
      size="lg"
      full
      className={`nf-slate-pill${quiet ? " nf-slate-pill--quiet" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}

/** The pill as a link, for a door that goes somewhere rather than submits. */
export function AuthPillLink({
  href,
  children,
  quiet = false,
  className,
  prefetch,
  onClick,
}: {
  href: string;
  children: ReactNode;
  quiet?: boolean;
  className?: string;
  prefetch?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <ButtonLink
      href={href}
      variant={quiet ? "ghost" : "primary"}
      size="lg"
      full
      {...(prefetch === undefined ? {} : { prefetch })}
      {...(onClick ? { onClick } : {})}
      className={`nf-slate-pill${quiet ? " nf-slate-pill--quiet" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </ButtonLink>
  );
}

/**
 * A round provider button. It carries no words on screen, so `label` is its
 * accessible name ("Continue with Google"), and the mark inside is decorative.
 */
export function AuthSocialButton({
  label,
  children,
  className,
  ...props
}: Omit<ComponentProps<"button">, "aria-label"> & { label: string }) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      className={`nf-slate-social${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

/** "Or", between two hairlines. */
export function AuthOrRule({ children }: { children: ReactNode }) {
  return (
    <div className="nf-slate-or" aria-hidden="true">
      <span>{children}</span>
    </div>
  );
}

/** The row the round provider buttons sit in, centred. */
export function AuthSocialRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="nf-slate-socials" role="group" aria-label={label}>
      {children}
    </div>
  );
}

/**
 * Google's standard "G", in Google's own four colours: the one mark on these
 * screens the house palette steps aside for, because Google's sign-in
 * branding rules require it. It is a file under `public/brand/third-party/`
 * so no raw colour lives in a component.
 */
export function GoogleMark({ size = 22 }: { size?: number }) {
  return (
    <Image
      src="/brand/third-party/google-g.svg"
      alt=""
      width={size}
      height={size}
      className="nf-slate-social__mark"
      unoptimized
    />
  );
}
