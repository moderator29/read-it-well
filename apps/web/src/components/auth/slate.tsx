import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, MouseEventHandler, ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { VectorMark, VectorWordmark } from "./VectorMark";
import "@/app/css/auth.css";

/**
 * THE SLATE SYSTEM: the pieces every door into Vallo is built from.
 *
 * Born from the references of 29 September (`docs/design/references/
 * 2026-09-29`, 12 and 14): a full-bleed block at the top whose bottom edge is
 * one wide bowl, the wordmark in it with a line under it, and below the bowl a
 * big title, labelled fields drawn as soft full-width cards, a full-width
 * button, an "Or" rule and round provider buttons.
 *
 * REBUILT ON 6 OCTOBER (W11, reference 7044 and the north star's "one Island
 * per auth screen on a photographic or brand ground"), KEEPING THE SHAPE A
 * MEMBER KNOWS (D28). The bowl is still there, the wordmark is still in it and
 * the object still sits across its edge; what changed is the material. The
 * bowl now holds a PHOTOGRAPH (or the brand's own blue ground on a recovery)
 * under a navy scrim instead of a flat bright blue, the wordmark is the
 * vector mark rather than a raster, and everything below the bowl lives in
 * one Island (`.nf-island`) rather than loose on the page. The glossy glass
 * fields and glowing ring of 30 September are gone with the rest of the
 * glass (D2, D15): fields are plates, the object is matte clay.
 *
 * THEME. The bowl is always night: a dark photograph under a navy scrim is a
 * dark thing in either theme, so its ink is the on-brand white in both. The
 * Island below it follows the member's theme (navy glass at night, white
 * with the blue-tinted shadow on Paper) except on the sign-up flow, which is
 * a night door whatever they chose (`AuthMain`).
 *
 * Exported for the other doors. Nothing here holds state, so every piece
 * renders on the server. Everything visual lives in `app/css/auth.css`; the
 * pieces only need to sit inside an element with the `nf-auth` class, or
 * carry `nf-slate` themselves, for the roles to resolve.
 */

/**
 * The bowl. `start` is the toolbar's one cell (the way back; language is
 * changed in Settings only, so there is no end cell, only an equal spacer so
 * the wordmark stays centred); `line` is the sentence under the wordmark;
 * `ground` is the picture; `focal` is the object across the bowl's edge.
 *
 * It also shortens itself on a touch screen while a field has focus (auth.css,
 * "THE KEYBOARD") so the primary button stays above the keys.
 */
export function AuthCap({
  line,
  start,
  brandHref = "/",
  brandLabel,
  ground,
  id,
}: {
  line?: ReactNode;
  start?: ReactNode;
  /** Where the wordmark goes. Null draws it as plain text, not a link. */
  brandHref?: string | null;
  /** The link's accessible name, from the dictionary (`a11y.logoHome`). */
  brandLabel: string;
  /** The photograph (or the brand ground) in the bowl. */
  ground: ReactNode;
  id?: string;
}) {
  const lockup = (
    <>
      <VectorMark size={28} className="nf-auth-cap__mark" />
      <VectorWordmark height={14} className="nf-auth-cap__word" />
    </>
  );
  return (
    <header id={id} className="nf-auth-cap">
      <div className="nf-auth-cap__ground" aria-hidden="true">
        {ground}
        <span className="nf-auth-cap__scrim" />
      </div>
      <div className="nf-auth-cap__inner">
        <div className="nf-auth-cap__bar">
          <div className="nf-auth-cap__start">{start}</div>
          {brandHref ? (
            /* `nf-tap`: the drawn link is 29px tall; the target is 44 (WCAG
               2.5.8 / the platform's own floor), painted nowhere. Not
               prefetched (C6, R3-18 round 2): the wordmark is a way out of
               sign-in, rarely taken, and prefetching it loaded the whole
               landing page's styles and code into every auth screen. */
            <Link href={brandHref} prefetch={false} aria-label={brandLabel} className="nf-auth-cap__brand nf-tap">
              {lockup}
            </Link>
          ) : (
            <span role="img" aria-label={brandLabel} className="nf-auth-cap__brand">
              {lockup}
            </span>
          )}
          {/* An equal cell, so the lockup is centred on the screen. */}
          <div className="nf-auth-cap__start" aria-hidden="true" />
        </div>
        {line ? <p className="nf-auth-cap__line">{line}</p> : null}
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
  /** The secondary pill (the outlined blue pill of the button system), for a second way on. */
  quiet?: boolean;
}) {
  return (
    <Button
      variant={quiet ? "secondary" : "primary"}
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
  testId,
}: {
  href: string;
  children: ReactNode;
  quiet?: boolean;
  className?: string;
  prefetch?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  testId?: string;
}) {
  return (
    <ButtonLink
      href={href}
      variant={quiet ? "secondary" : "primary"}
      size="lg"
      full
      {...(prefetch === undefined ? {} : { prefetch })}
      {...(onClick ? { onClick } : {})}
      {...(testId ? { "data-testid": testId } : {})}
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
