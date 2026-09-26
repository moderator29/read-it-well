import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
/*
 * The partial is imported here rather than from globals.css because the partial
 * is not in its ordered import list yet. When `css/system.css` is added to that
 * list, delete this line and nothing else changes: every rule in it is
 * inside `@layer components` and every class name is new, so it has no
 * position in the cascade to lose.
 */
import "@/app/css/system.css";

/**
 * The brand moment.
 *
 * The three moments the product has nothing to show but itself, a crash, a
 * missing page and a dead network, share one anatomy taken from the sign-in
 * render (`docs/design/references/55A56F21`): the lockup over the aurora
 * plate, one glass card with a lit rim standing on a podium, the podium's
 * reflection in the floor. This component is that anatomy; each page puts
 * its own sentence and its own way out inside the card.
 *
 * It lives under `app/offline` because that route is the purest instance
 * (no network, no data, nothing but the moment) and because it is the one
 * folder in this scope; it belongs in `components/app/` and is filed for
 * promotion in the ledger.
 *
 * Server safe, no hooks, so a server page (not found, offline) and a client
 * boundary (the two error files) render the same object.
 *
 * `offline` swaps `next/image` for plain images: the optimiser mints hashed
 * `/_next/image` URLs that the offline cache has no way to hold, whereas the
 * service worker precaches `/pwa/icon-192.png` and runtime-caches `/brand/`
 * on an allowlist, so on a dead network the tile is guaranteed and the plate
 * is there whenever a previous visit fetched it. When it is not, the CSS
 * aurora under it is the designed ground and there is no hole.
 *
 * `inset` is the in-app boundary, where the header above already carries
 * the lockup: the moment fills the content area between header and dock,
 * and the brand is the tile alone rather than a second wordmark under the
 * one in the chrome.
 */
export function SystemMoment({
  home = "/",
  homeLabel = "Vallo home",
  inset = false,
  offline = false,
  children,
  aside,
}: {
  /** Where the lockup links. Root pages resolve the reader's real home. */
  home?: string;
  /** The lockup's name for a screen reader. The not-found, offline and root
      error screens are written in English and keep the English name; the
      in-app error screen speaks the reader's language and passes theirs. */
  homeLabel?: string;
  inset?: boolean;
  offline?: boolean;
  children: ReactNode;
  /** The quiet line beneath the podium. */
  aside?: ReactNode;
}) {
  const stageClass = inset ? "nf-system nf-system--inset" : "nf-system";
  const Stage: "main" | "div" = inset ? "div" : "main";

  return (
    /* A night stage in both themes, like the auth screen: the podium and the
       aurora are night artwork (light mode reintroduced 25 September 2026). */
    <Stage id={inset ? undefined : "main"} className={stageClass} data-theme="dark">
      <div className="nf-system__plate" aria-hidden="true">
        {offline ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/photos/bg-blue-wave.jpg" alt="" decoding="async" />
        ) : (
          <Image src="/brand/photos/bg-blue-wave.jpg" alt="" fill sizes="100vw" priority />
        )}
      </div>
      <div className="nf-aurora" aria-hidden="true" />

      <div className="nf-system__stage">
        <Link href={home} aria-label={homeLabel} className="nf-system__brand nf-tap">
          {offline ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/pwa/icon-192.png"
              alt=""
              aria-hidden="true"
              width={192}
              height={192}
              className="nf-system__icon"
            />
          ) : (
            <Image
              src="/brand/vallo-icon.png"
              alt=""
              width={104}
              height={104}
              priority
              className={inset ? "nf-system__icon nf-system__icon--sm" : "nf-system__icon"}
            />
          )}
          {!inset && !offline && (
            <Image
              src="/brand/vallo-wordmark.png"
              alt="Vallo"
              width={176}
              height={39}
              priority
              className="nf-system__wordmark"
            />
          )}
          {offline && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand/vallo-wordmark.png"
              alt="Vallo"
              width={758}
              height={167}
              decoding="async"
              className="nf-system__wordmark"
            />
          )}
        </Link>

        <div className="nf-panel nf-panel--glass nf-system__card">{children}</div>
        <div className="nf-system__podium" aria-hidden="true" />

        {aside ? <p className="nf-system__aside">{aside}</p> : null}
      </div>
    </Stage>
  );
}
