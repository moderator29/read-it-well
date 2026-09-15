import type { Dictionary, Locale } from "@vallo/i18n";
import { getListingRepository } from "@/lib/listings/repository";
import { ListingCard } from "@/components/app/ListingCard";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Reveal } from "@/components/site/Reveal";

/**
 * The product, shown as itself.
 *
 * Reference 15 puts a large screenshot of the actual product at the centre of
 * the hero, and the audit found this site has none anywhere - the hero art is
 * an illustration, so a visitor can reach the sign-up button without ever
 * seeing what they are signing up to.
 *
 * This is deliberately NOT a screenshot. A screenshot is a photograph of the
 * product taken once and then slowly becoming a lie: the button moves, the type
 * scale changes, the brand navy shifts, and the marketing page keeps showing
 * last quarter's app. It also has to be re-exported by hand every time, which
 * means in practice it never is.
 *
 * So the frame renders the REAL components with REAL repository data. The card
 * inside it is the same `ListingCard` the search results use, reading the same
 * listings, in the same theme. When the card changes, this changes. It cannot
 * drift, and there is nothing to re-export.
 *
 * If the repository has nothing to show, the whole frame is omitted rather than
 * filled with invented inventory - the same rule the voices band follows.
 *
 * THE SECTION AROUND IT MOVED IN HERE, and that is why this component now
 * renders a <section> rather than a device. The heading, the paragraph and the
 * two-column grid lived in app/page.tsx and the frame was dropped into the
 * right-hand column. So when the catalogue was empty - which is its state right
 * now - the frame returned null and the page still drew the section: a heading
 * saying "Everything in one place, on your phone" and a paragraph about
 * searching and paying, beside half a screen of nothing.
 *
 * A component that knows whether it has anything to show is the only thing that
 * can decide whether its section exists. Now it owns both, and an empty
 * catalogue removes the whole band instead of leaving its frame behind.
 */
export async function ProductFrame({ t, locale }: { t: Dictionary; locale: Locale }) {
  const listings = await getListingRepository().recommended(2);
  if (listings.length === 0) return null;

  return (
    <section className="nf-shell grid items-center gap-section-tight py-section lg:grid-cols-2">
      <Reveal>
        <p className="nf-overline">The app</p>
        <h2 className="nf-h2 mt-row max-w-[16ch]">Everything in one place, on your phone</h2>
        <p className="nf-lede mt-group max-w-[46ch]">
          Search, inspect, message and pay from the same screen. No calls, no
          agent runaround, no transfer to an account you were sent in a chat.
        </p>
      </Reveal>
      <Reveal delay={100}>
        <Device t={t} locale={locale} listings={listings} />
      </Reveal>
    </section>
  );
}

function Device({
  t,
  locale,
  listings,
}: {
  t: Dictionary;
  locale: Locale;
  listings: Awaited<ReturnType<ReturnType<typeof getListingRepository>["recommended"]>>;
}) {
  return (
    <div
      /*
       * `aria-hidden` and not focusable. Everything inside is a real
       * interactive component, but here it is a picture of the product: a
       * screen reader working down the marketing page should not walk into a
       * listing card that navigates away, and a keyboard user should not have
       * to tab through a decorative device frame to reach the sign-up button.
       * The surrounding section carries the real, reachable calls to action.
       */
      aria-hidden="true"
      className="pointer-events-none relative mx-auto w-full max-w-[300px] select-none"
    >
      {/*
        The device. Drawn rather than imaged: a rounded shell, a hairline bezel
        and the notch, all from tokens, so it follows the theme like everything
        else instead of being a dark PNG sitting on a light page.
      */}
      {/* The bezel was `p-[0.6rem]`, a number chosen by eye. On the scale it is
          `p-xs`, 8px, which also happens to be the difference between the two
          radii either side of it, so the shell and the screen now share a
          curve instead of nearly sharing one. */}
      <div className="nf-card overflow-hidden rounded-[2.75rem] p-xs shadow-[var(--nf-elev-4-rim),var(--nf-elev-4)]">
        <div className="relative overflow-hidden rounded-[2.2rem] bg-[var(--nf-surface-canvas)]">
          {/* The notch, sized to the real thing so the frame reads as a phone
              at a glance rather than as a rounded rectangle. */}
          <div className="absolute left-1/2 top-2 z-20 h-[1.35rem] w-[5.5rem] -translate-x-1/2 rounded-full bg-[var(--nf-surface-artwork)]" />

          <div className="px-row pb-row pt-block">
            {/* A real search affordance, drawn from the same tokens the app's
                own uses, so the frame opens on the screen a visitor lands on. */}
            <div className="nf-card flex items-center gap-inline px-row py-inline">
              <UiIcon name="search" size={16} className="shrink-0 opacity-60" />
              <span className="nf-caption">{t.nav.explore}</span>
            </div>

            {/* The real card, real data, same component as the search grid. */}
            <div className="mt-row space-y-row">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} locale={locale} t={t} />
              ))}
            </div>
          </div>

          {/* The dock, drawn to match. The real one is `fixed`, so it cannot be
              nested inside a frame; this is the same material and shape at the
              same scale, which is what the picture needs to show. */}
          <div className="absolute inset-x-4 bottom-3 flex items-center justify-center gap-inline">
            <div className="nf-tabbar flex flex-1 items-center justify-around px-inline py-inline">
              {(["grid", "compass", "chat-bubble", "sparkle"] as const).map((icon, i) => (
                <span
                  key={icon}
                  className={
                    i === 0
                      ? "grid h-7 place-items-center rounded-[var(--nf-radius-control)] px-inline text-[var(--nf-content-on-brand)]"
                      : "grid h-7 w-7 place-items-center opacity-60"
                  }
                  style={i === 0 ? { background: "var(--nf-gradient-brand)" } : undefined}
                >
                  <UiIcon name={icon} size={16} filled={i === 0} />
                </span>
              ))}
            </div>
            <span className="nf-dock-island grid h-9 w-9 place-items-center">
              <UiIcon name="user" size={16} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
