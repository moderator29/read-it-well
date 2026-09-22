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
 * The render shows App Store and Google Play badges, and on the founder's
 * ruling of 19 September they now carry the real marks: the listings go live
 * shortly. Each badge reads its destination from the environment
 * (`NEXT_PUBLIC_APP_STORE_URL`, `NEXT_PUBLIC_PLAY_STORE_URL`) and falls back
 * to `/start`, where the browser install prompt lives, until the store URL
 * exists. That is the honest arrangement: the badge is the real badge, and
 * the day the listing is published the link becomes the listing with one
 * environment variable and no code change. It never points at a store page
 * that is not there, and it never says coming soon.
 *
 * The phone beside them is drawn, not cropped from the render, with the
 * portrait villa plate and a real listing card on its screen.
 */
/*
 * Where a badge goes. Read at module scope because `NEXT_PUBLIC_*` is inlined
 * at build time, and defaulted to the browser install page so the control is
 * never dead while the store listings are still in review.
 */
const IOS_HREF = process.env.NEXT_PUBLIC_APP_STORE_URL || "/start";
const ANDROID_HREF = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "/start";

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
    <section className="nf-shell pt-section-tight pb-section" aria-labelledby="nf-landing-app-title">
      <div className="nf-landing-app">
        <Reveal className="flex flex-col gap-heading">
          <div>
            <h2 id="nf-landing-app-title" className="nf-h1 max-w-measure-display">
              {a.title}
            </h2>
            <p className="nf-lede mt-group max-w-measure-lede">{a.body}</p>
          </div>
          <div className="flex flex-wrap gap-row">
            <Link href={IOS_HREF} className="nf-landing-store" prefetch={false}>
              <UiIcon name="apple" size={26} aria-hidden />
              <span>
                <small>{a.iosSub}</small>
                <strong>{a.ios}</strong>
              </span>
            </Link>
            <Link href={ANDROID_HREF} className="nf-landing-store" prefetch={false}>
              <UiIcon name="google-play" size={24} aria-hidden />
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
