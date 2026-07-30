import type { Metadata } from "next";
import { RetryButton } from "./RetryButton";

/**
 * The offline shell.
 *
 * Precached by `public/sw.js` at install and served whenever a navigation
 * cannot reach the network. Two constraints shape it:
 *
 *   1. It must render with no network at all, so it uses no remote image, no
 *      optimised `next/image` URL and no data source. The one graphic is
 *      `/pwa/icon-192.png`, which the worker precaches alongside this
 *      document, as a plain `img` so there is no hashed optimiser URL to miss.
 *   2. The copy has to be honest. RentMe never answers a question about
 *      money, messages or bookings from an old copy, so this screen says that
 *      plainly rather than implying more works offline than really does.
 */
export const metadata: Metadata = {
  title: "You are offline",
  description: "RentMe could not reach the network. Reconnect to carry on.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-12 text-center"
    >
      <div className="nf-aurora" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md">
        {/*
          A plain img, not next/image: the optimiser would mint a hashed
          /_next/image URL that the offline cache has no way to hold.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pwa/icon-192.png"
          alt=""
          aria-hidden="true"
          width={72}
          height={72}
          className="mx-auto h-[72px] w-[72px] rounded-[1.25rem]"
        />

        <div className="nf-card mt-6 p-7 sm:p-9">
          <p className="nf-overline text-[var(--nf-content-muted)]">Connection</p>
          <h1 className="nf-h2 mt-2">You are offline</h1>
          <p className="mt-3 text-[0.9375rem] text-[var(--nf-content-secondary)]">
            The connection dropped before this page could load. Nothing you were
            doing has been lost, and nothing was half sent.
          </p>

          <ul className="mt-6 space-y-3 text-left text-[0.875rem] text-[var(--nf-content-secondary)]">
            <li className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nf-brand-primary)]"
              />
              <span>
                RentMe stays on your home screen and opens straight to this
                screen, so you never land on a browser error page.
              </span>
            </li>
            <li className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nf-brand-primary)]"
              />
              <span>
                Your balance, your messages and your bookings are never shown
                from an old copy. You always see the real figure, never a stale
                one.
              </span>
            </li>
            <li className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nf-brand-primary)]"
              />
              <span>
                The app keeps its artwork and code on your phone, so coming back
                online costs far less of your data bundle than a first visit.
              </span>
            </li>
          </ul>

          <RetryButton />
        </div>

        <p className="mt-6 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Worth checking: mobile data switched on, aeroplane mode off, and
          enough left on your bundle.
        </p>
      </div>
    </main>
  );
}
