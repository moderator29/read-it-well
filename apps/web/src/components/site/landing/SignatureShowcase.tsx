import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { Icon } from "@/design-system/icons/Icon";
import { LogoMark } from "@/design-system/brand/Logo";

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
                <span className="h-11 w-11 shrink-0">
                  <Icon name="search" fill />
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
                <span className="h-11 w-11 shrink-0">
                  <Icon name="verified" fill />
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

            <Link href="/search" className="nf-btn nf-btn--primary nf-btn--lg mt-8">
              Explore Properties
            </Link>
          </div>

          <div className="relative min-h-[240px] sm:min-h-[340px] lg:min-h-0">
            <Image
              src="/brand/rentme-villa.png"
              alt="A neon-lit RentMe waterfront villa at night"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            {/* Feather the artwork into the glass on the seam side. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[rgb(1_1_24_/_0.55)] via-transparent to-transparent lg:bg-gradient-to-r lg:from-[rgb(1_1_24_/_0.6)] lg:via-transparent lg:to-transparent"
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
          href="/search?view=map"
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

export function AssistantShowcase() {
  return (
    <section className="nf-shell pt-16 sm:pt-20" aria-labelledby="nf-assistant-title">
      <Reveal>
        <div className="nf-card overflow-hidden p-0 lg:grid lg:grid-cols-[1fr_1.02fr]">
          <div className="relative order-last min-h-[240px] sm:min-h-[340px] lg:order-first lg:min-h-0">
            <Image
              src="/brand/rentme-assistant.png"
              alt="The RentMe AI assistant on a holographic stage"
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
              Ask in plain words. <span className="nf-gradient-text">Get real places.</span>
            </h2>
            <p className="mt-3 max-w-[46ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)]">
              Your smart travel buddy reads the whole catalogue: budgets, areas, amenities and
              vibes, then hands you places you can actually book.
            </p>

            <ul className="mt-6 flex flex-wrap gap-2">
              {[
                "2 bedroom in Lekki under 300k",
                "Weekend hotel in Abuja with a pool",
                "Best suya spots in Ibadan",
              ].map((prompt) => (
                <li key={prompt}>
                  <Link
                    href={`/assistant?q=${encodeURIComponent(prompt)}`}
                    className="nf-chip text-[0.8125rem]"
                  >
                    {prompt}
                  </Link>
                </li>
              ))}
            </ul>

            <Link href="/assistant" className="nf-btn nf-btn--primary nf-btn--lg mt-8">
              Meet the assistant
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
