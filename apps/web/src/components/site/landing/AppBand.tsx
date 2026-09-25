import Image from "next/image";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MiniListing } from "@/lib/site/listing-card";
import { photo } from "@/lib/site/photos";
import { ListingMini } from "./ListingMini";
import { storeBadges } from "./store-badges";
import { StoreBadges } from "./StoreBadges";

/**
 * Take Vallo with you.
 *
 * STORE-06 (also UI-07, UX-26). The store badges used to render with their
 * links falling back to `/start` until a store URL existed, and they rendered
 * inside the native shell too: a "GET IT ON Google Play" badge inside the iOS
 * app (App Store 2.3.10), and a badge that does not lead to the store (both
 * stores' badge terms). Now:
 *
 *   - each badge renders ONLY when its store URL is set and is that store's
 *     own address (`storeBadges` in `store-badges.ts`);
 *   - neither renders inside a native shell, whatever is set (`LandingBody`
 *     passes the surface the server read from the shell's User-Agent);
 *   - "Full access to all features" and "Secure and fast" are gone.
 *
 * The phone beside them is drawn, not cropped from the render, with the
 * portrait villa plate and a real listing card on its screen.
 */
export function AppBand({
  t,
  locale,
  listing,
  native = false,
}: {
  t: Dictionary;
  locale: Locale;
  listing: MiniListing | null;
  /** True when the server is rendering for a native shell. */
  native?: boolean;
}) {
  /* Two phones, as the render shows: one carrying a real listing card, one
     carrying the brand face the app opens on. Both are drawn from the
     product's own parts, never cropped from the render. */
  const a = t.landing.face.app;
  const points = [a.points.notify, a.points.design];
  /* `NEXT_PUBLIC_*` is inlined at build time. */
  const badges = storeBadges({
    appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL,
    playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL,
    native,
  });
  return (
    <section className="nf-shell pt-section-tight pb-section" aria-labelledby="nf-landing-app-title">
      <div className="nf-landing-app">
        <Reveal className="flex flex-col gap-heading">
          <div>
            <h2 id="nf-landing-app-title" className="nf-h1 max-w-measure-display">
              {a.title}
            </h2>
            <p className="nf-lede mt-group max-w-measure-lede">{a.body}</p>
          </div>
          {/* The official artwork, drawn inline (StoreBadges.tsx). */}
          <StoreBadges badges={badges} labels={t.landingRooms.badges} />
        </Reveal>

        <Reveal delay={60}>
          {/* DOC-21: `inert` as well as `aria-hidden`. The phones are a
              picture of the app, but the listing card drawn inside them
              holds a real link, and aria-hidden alone left that link in the
              tab order, focusable and unannounced (axe `aria-hidden-focus`). */}
          <div className="nf-landing-phones" aria-hidden="true" inert>
            <div className="nf-landing-phone nf-landing-phone--back">
              <div className="nf-landing-phone-screen">
                <Image
                  src={photo("villa-pool-portrait")}
                  alt=""
                  fill
                  sizes="200px"
                />
                {listing && (
                  <div className="nf-landing-phone-card">
                    <div className="nf-landing-float">
                      <ListingMini
                        listing={listing}
                        locale={locale}
                        verifiedLabel={t.landing.face.card.verified}
                        sizes="180px"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="nf-landing-phone nf-landing-phone--front">
              <div className="nf-landing-phone-screen nf-landing-phone-screen--brand">
                <Logo size={46} wordSize={20} />
                {/* `appMockLine`, not `slogan`: this is a picture of the app on the
                    marketing front page, and it was the last surface still
                    showing the retired positioning to a visitor. The auth
                    lockup keeps `slogan` until the founder rules on it. */}
                <span className="nf-landing-phone-slogan">{t.landing.appMockLine}</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="nf-landing-stack-card">
            <h3 className="nf-h3">{a.rightTitle}</h3>
            <ul className="nf-landing-checks mt-group">
              {points.map((p) => (
                <li key={p}>
                  <UiIcon name="verified" size={18} aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
