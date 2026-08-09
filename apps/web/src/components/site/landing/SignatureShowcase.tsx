import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { LogoMark } from "@/design-system/brand/Logo";
import { gatedHref } from "@/lib/site/gated-href";

/**
 * The signature landing showcases, built around the three commissioned
 * artworks: the neon villa, the lit map of Nigeria, and the assistant
 * hologram. Copy is the owner's canonical wording for these panels.
 */

export function VillaShowcase() {
  return (
    <section className="nf-shell pt-16 sm:pt-20" aria-labelledby="nf-villa-title">
      <Reveal>
        <div className="nf-card overflow-hidden p-0 lg:grid lg:grid-cols-[1.02fr_1fr]">
          <div className="flex flex-col items-start justify-center p-6 sm:p-10 lg:p-12">
            <LogoMark
              size={52}
              className="mb-5 rounded-2xl shadow-[0_0_24px_rgb(12_57_239/0.35)] ring-1 ring-[var(--nf-border-subtle)]"
            />
            <h2 id="nf-villa-title" className="nf-h1">
              Find it. Rent it. <span className="nf-gradient-text">Love it.</span>
            </h2>
            <p className="mt-3 max-w-[46ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)]">
              The smartest way to discover and rent properties across Nigeria.
            </p>

            <ul className="mt-7 space-y-5">
              <li className="flex items-center gap-4">
                <span className="h-16 w-16 shrink-0">
                  <BrandIcon name="home-search" fill />
                </span>
                <span>
                  <span className="block font-semibold text-[var(--nf-content-primary)]">
                    Smart Search
                  </span>
                  <span className="block text-[0.875rem] text-[var(--nf-content-muted)]">
                    Find the perfect place fast.
                  </span>
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="h-16 w-16 shrink-0">
                  <BrandIcon name="shield-check" fill />
                </span>
                <span>
                  <span className="block font-semibold text-[var(--nf-content-primary)]">
                    Verified Listings
                  </span>
                  <span className="block text-[0.875rem] text-[var(--nf-content-muted)]">
                    Trusted properties, always.
                  </span>
                </span>
              </li>
            </ul>

            <ButtonLink href={gatedHref("/search")} variant="primary" size="lg" className="mt-8">
              Explore Properties
            </ButtonLink>
          </div>

          <div className="relative flex min-h-[240px] items-center justify-center p-6 sm:min-h-[320px] sm:p-8">
            <Image
              src="/brand/rentme-city.png"
              alt="The neon RentMe city island"
              width={1536}
              height={888}
              sizes="(max-width: 1024px) 90vw, 46vw"
              className="h-auto w-full max-w-[580px] drop-shadow-[0_30px_60px_rgba(12,57,239,0.45)]"
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function CoverageMap() {
  return (
    <section className="nf-shell pt-16 sm:pt-20" aria-labelledby="nf-coverage-title">
      <Reveal>
        <div className="mb-6 text-center sm:mb-8">
          <span className="nf-overline">Nationwide</span>
          <h2 id="nf-coverage-title" className="nf-h2 mt-2">
            All 36 states. One lit map.
          </h2>
          <p className="mx-auto mt-2 max-w-[52ch] text-[var(--nf-content-secondary)]">
            From Lagos to Maiduguri, every covered city glows on the RentMe grid. Tap the map
            to explore by location.
          </p>
        </div>
        <Link
          href={gatedHref("/search?view=map")}
          aria-label="Open the RentMe coverage map"
          className="nf-card nf-card--interactive block overflow-hidden p-0"
        >
          <Image
            src="/brand/rentme-map.png"
            alt="The RentMe map of Nigeria with lit city markers"
            width={1536}
            height={1024}
            sizes="(max-width: 1024px) 100vw, 1080px"
            className="h-auto w-full"
          />
        </Link>
      </Reveal>
    </section>
  );
}

/**
 * The assistant, shown doing the thing it actually does.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS HERE CONTRADICTED THE PRODUCT, IN EVERY LINE.
 *
 * "Your smart travel buddy" on a platform for renting and buying property.
 * Three sample prompts, of which one was "Weekend hotel in Abuja with a pool"
 * and one was "Best suya spots in Ibadan" - a restaurant search, on a platform
 * that stopped serving restaurants. "Places you can actually book", when the
 * market this is built for is a year's tenancy nobody books in one tap.
 *
 * A person reading a landing page believes the examples more than the prose,
 * because an example is a demonstration rather than a claim. Three examples of
 * things we do not do is worse than no examples at all.
 *
 * ---------------------------------------------------------------------------
 * SO IT SHOWS AN EXCHANGE INSTEAD OF ADVERTISING ONE.
 *
 * A short conversation, as it would actually run: somebody types a real
 * request in the vocabulary this platform uses, and the reply is what the
 * assistant genuinely returns - properties from the catalogue with the two
 * facts that decide a Nigerian tenancy, the move-in total and the light.
 *
 * IT IS MARKED UP AS WHAT IT IS. Not a live thread and not presented as one:
 * a figure with a caption saying this is an example of the assistant
 * answering. Drawing a fake conversation and letting it read as a real
 * transcript is the same class of thing as an unlabelled example listing.
 */
export function AssistantShowcase() {
  return (
    <section className="nf-shell pt-16 sm:pt-20" aria-labelledby="nf-assistant-title">
      <Reveal>
        <div className="nf-card overflow-hidden p-0 lg:grid lg:grid-cols-[1fr_1.02fr]">
          <div className="relative order-last min-h-[240px] sm:min-h-[340px] lg:order-first lg:min-h-0">
            <Image
              src="/brand/rentme-assistant.png"
              alt="The RentMe assistant"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[rgb(1_1_24_/_0.55)] via-transparent to-transparent lg:bg-gradient-to-l lg:from-[rgb(1_1_24_/_0.6)] lg:via-transparent lg:to-transparent"
            />
          </div>

          <div className="flex flex-col items-start justify-center p-6 sm:p-10 lg:p-12">
            <span className="nf-overline">RentMe AI</span>
            <h2 id="nf-assistant-title" className="nf-h1 mt-2">
              Ask in plain words. <span className="nf-gradient-text">Get real property.</span>
            </h2>
            <p className="mt-row max-w-[46ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)]">
              It reads the whole catalogue: the rent, the move-in total, the
              bedrooms, the area, and whether there is light. Then it answers
              with properties that are actually listed.
            </p>

            <figure className="mt-block w-full max-w-[34rem]">
              <div className="flex flex-col gap-inline">
                <p className="self-end max-w-[26ch] rounded-[var(--nf-radius-lg)] rounded-br-[var(--nf-radius-xs)] bg-[var(--nf-brand-primary)] px-sm py-inline text-[0.875rem] leading-snug text-[var(--nf-content-on-brand)]">
                  2 bedroom in Yaba, under 2 million a year
                </p>
                <p className="self-start max-w-[32ch] rounded-[var(--nf-radius-lg)] rounded-bl-[var(--nf-radius-xs)] border border-[var(--nf-border-subtle)] bg-[var(--nf-glass-fill-thin)] px-sm py-inline text-[0.875rem] leading-snug text-[var(--nf-content-secondary)]">
                  Four in Yaba inside that. The closest is 1.2m a year, move in
                  1.8m with caution and agency, one bedroom short of what you
                  asked. Want me to widen to Akoka?
                </p>
              </div>
              <figcaption className="nf-caption mt-inline text-[var(--nf-content-muted)]">
                An example of how the assistant answers. Ask it yourself for real
                results.
              </figcaption>
            </figure>

            <ButtonLink href={gatedHref("/assistant")} variant="primary" size="lg" className="mt-heading">
              Meet the assistant
            </ButtonLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
