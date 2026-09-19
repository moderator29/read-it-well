import Image from "next/image";
import Link from "next/link";
import type { Dictionary, Locale } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { Logo } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MiniListing } from "@/lib/site/listing-card";
import { photo } from "@/lib/site/photos";
import { ListingMini } from "./ListingMini";

/**
 * Take Vallo with you.
 *
 * The render shows App Store and Google Play badges. There are no store
 * listings (native identifiers are on the stop list), and Vallo installs
 * from the browser as a PWA on both platforms today, so the two badges are
 * glass buttons saying exactly that and pointing at /start, where the
 * install prompt lives once somebody has an account. The phone is drawn, not
 * cropped from the render, with the portrait villa plate and a real listing
 * card on its screen.
 */
export function AppBand({
  t,
  locale,
  listing,
}: {
  t: Dictionary;
  locale: Locale;
  listing: MiniListing | null;
}) {
  /* Two phones, as the render shows: one carrying a real listing card, one
     carrying the brand face the app opens on. Both are drawn from the
     product's own parts, never cropped from the render. */
  const a = t.landing.face.app;
  const points = [a.points.all, a.points.notify, a.points.fast, a.points.design];
  return (
    <section className="nf-shell py-section" aria-labelledby="nf-landing-app-title">
      <div className="nf-landing-app">
        <Reveal className="flex flex-col gap-heading">
          <div>
            <h2 id="nf-landing-app-title" className="nf-h1 max-w-measure-display">
              {a.title}
            </h2>
            <p className="nf-lede mt-group max-w-measure-lede">{a.body}</p>
          </div>
          <div className="flex flex-wrap gap-row">
            <Link href="/start" className="nf-landing-store" prefetch={false}>
              <UiIcon name="arrow-down" size={18} aria-hidden />
              <span>
                <small>{a.iosSub}</small>
                <strong>{a.ios}</strong>
              </span>
            </Link>
            <Link href="/start" className="nf-landing-store" prefetch={false}>
              <UiIcon name="arrow-down" size={18} aria-hidden />
              <span>
                <small>{a.androidSub}</small>
                <strong>{a.android}</strong>
              </span>
            </Link>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="nf-landing-phones" aria-hidden="true">
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
                <span className="nf-landing-phone-slogan">{t.landing.slogan}</span>
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
