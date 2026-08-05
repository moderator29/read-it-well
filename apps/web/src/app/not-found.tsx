import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";
import { LogoMark } from "@/design-system/brand/Logo";

/**
 * 404.
 *
 * Says what happened and offers the next step, per the no dead ends rule.
 * Deliberately static so it renders even when data sources are unavailable.
 * The floating category objects are decorative and hidden from assistive
 * technology, a quiet reminder of everything that is still findable.
 */
export default function NotFound() {
  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 text-center"
    >
      <div className="nf-aurora" aria-hidden="true" />

      {/* Floating decorative objects */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="nf-float absolute left-[8%] top-[16%] block h-16 w-16 opacity-25 md:h-20 md:w-20">
          <BrandIcon name="hotel-star" fill />
        </span>
        <span className="nf-float-slow absolute right-[10%] top-[22%] block h-14 w-14 opacity-20 md:h-16 md:w-16">
          <BrandIcon name="gift" fill />
        </span>
        <span className="nf-float-slow absolute bottom-[24%] left-[14%] block h-16 w-16 opacity-20 md:h-14 md:w-14">
          <BrandIcon name="luggage-check" fill />
        </span>
        <span className="nf-float absolute bottom-[18%] right-[12%] block h-16 w-16 opacity-25 md:h-[4.5rem] md:w-[4.5rem]">
          <BrandIcon name="map-route" fill />
        </span>
      </div>

      <div className="relative z-10">
        <Link href="/" aria-label="RentMe home" className="nf-tap inline-flex">
          <LogoMark size={64} />
        </Link>

        <p className="nf-numeric nf-display nf-gradient-text mt-6 text-[clamp(5rem,18vw,9rem)]">
          404
        </p>

        <h1 className="nf-h2 mt-2">This page has checked out</h1>
        <p className="mx-auto mt-3 max-w-[44ch] text-[var(--nf-content-secondary)]">
          The link may be out of date, or the page may have moved. Everything else
          across Nigeria is still open for discovery.
        </p>

        <div className="mx-auto mt-8 max-w-md">
          <ButtonLink
            href="/search"
            variant="secondary"
            full
            className="justify-start rounded-full text-left"
          >
            <UiIcon name="search" size={20} className="shrink-0 text-[var(--nf-content-muted)]" />
            <span className="text-[0.9375rem] text-[var(--nf-content-secondary)]">
              Search hotels, food, experiences...
            </span>
          </ButtonLink>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/" variant="primary" size="lg">
            Back to home
          </ButtonLink>
          <ButtonLink href="/search" variant="secondary" size="lg" leadingIcon="sparkle">
            Explore instead
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
