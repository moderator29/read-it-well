"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * The two screens before sign up.
 *
 * WHY TWO AND NOT THREE. The reference platform runs three, and the third is
 * where a person's patience runs out: an onboarding carousel is a toll on the
 * way to the thing somebody already decided to do when they pressed Sign up.
 * Two is enough to say what RentMe is and what makes it different, and the
 * owner asked for two.
 *
 * WHY IT IS NOT SKIPPABLE-BY-ACCIDENT AND ALWAYS SKIPPABLE-ON-PURPOSE. Skip is
 * present on both screens, at the top, where a returning user's thumb goes.
 * Nobody who knows what this is should have to read it twice, and the fastest
 * way to make an intro feel cheap is to trap somebody in it.
 *
 * WHAT IT SAYS. Both claims are true today and neither needs a lawyer:
 * every listing is put up by a real person on this platform, and the person
 * behind one climbs a verification ladder that the product shows honestly
 * rather than calling everyone verified. No escrow promise, no "thousands of
 * properties", no store badges. The intro to a product is exactly where an
 * untrue sentence does the most damage, because it is the first one read.
 *
 * THE DRAWING. The reference is flat pastel with a stock illustration. Ours is
 * the platform's own dark glass with the brand object large and lit, which is
 * the one visual language RentMe already owns. The panel does not move between
 * slides: only the object, the words and the dots change, so the transition is
 * a change of subject rather than a page swap, and there is no layout shift to
 * make it feel cheap.
 */

type Slide = {
  icon: BrandIconName;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: "home-search",
    title: "Find your next place",
    body: "Rent, buy or sell property across Nigeria. Shortlets, flats, land, shops and offices, all in one place.",
  },
  {
    icon: "home-check",
    title: "Deal with a real person",
    body: "Every listing here was put up by somebody on RentMe, so there is always an owner to message and a property you can arrange to see.",
  },
];

export function StartCarousel() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index]!;
  const last = index === SLIDES.length - 1;

  /*
   * The primary control advances, then leaves. Prefetching sign up on the
   * first slide means the form is already there when the second one is
   * dismissed, which is what makes this feel like one flow rather than two
   * pages with a wait between them.
   */
  const advance = () => {
    if (last) router.push("/sign-up");
    else setIndex((i) => i + 1);
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {/* Skip sits above the panel and is a link, not a button: it is a
          destination, it should middle-click and it should be in the tab order
          before the thing that keeps you here. */}
      <div className="mb-block flex w-full justify-end">
        <Link
          href="/sign-up"
          prefetch
          className="nf-body-sm rounded-[var(--nf-radius-control)] px-inline py-inline-tight text-[var(--nf-content-secondary)] transition-colors hover:text-[var(--nf-content-primary)]"
        >
          Skip
        </Link>
      </div>

      {/*
        NO `nf-card` HERE, and it is the one nesting rule with no exceptions.

        The auth layout already wraps its children in `nf-card`, so the first
        version of this drew a glass panel inside a glass panel: two rounded
        rectangles, two rims, two shadows, for one piece of content. It is the
        same mistake the listing creation screen was carrying with ten of them.
        Checked by rendering the page at 390px rather than by reading the
        layout, which is how it was spotted.
      */}
      <section
        aria-roledescription="carousel"
        aria-label="What RentMe is"
        className="w-full text-center"
      >
        {/*
          `key` on the object and on the copy, not on the panel. React swaps
          these two subtrees when the index changes, so the entry animation
          replays for the contents while the card itself stays exactly where it
          is. A panel that re-enters on every tap reads as a page reload.
        */}
        <span key={`art-${index}`} className="nf-story-art nf-card-in mx-auto block h-32 w-32">
          <BrandIcon name={slide.icon} fill />
        </span>

        <div key={`copy-${index}`} className="nf-card-in">
          <h1 className="nf-h2 mt-heading">{slide.title}</h1>
          <p className="nf-body mx-auto mt-block max-w-[38ch] text-[var(--nf-content-secondary)]">
            {slide.body}
          </p>
        </div>

        {/*
          Progress, and it is a list rather than three divs because it is one.
          `aria-current` names the active step for a screen reader; the dots
          themselves are hidden from it, since "step 1 of 2" is already carried
          by the label on the button below.
        */}
        <ul className="mt-block flex items-center justify-center gap-inline-tight" aria-hidden="true">
          {SLIDES.map((s, i) => (
            <li
              key={s.title}
              className={`h-1.5 rounded-[var(--nf-radius-pill)] transition-all duration-[var(--nf-duration-base)] ${
                i === index
                  ? "w-7 bg-[var(--nf-brand-primary)]"
                  : "w-1.5 bg-[var(--nf-border-strong)]"
              }`}
            />
          ))}
        </ul>

        <Button
          type="button"
          variant="primary"
          onClick={advance}
          className="mt-block w-full"
          aria-label={last ? "Create your account" : `Next, step 2 of ${SLIDES.length}`}
        >
          {last ? "Create account" : "Next"}
        </Button>

        {/* The other door. Somebody who already has an account pressed the
            wrong button in the header, and making them walk the intro to find
            that out is the rudest thing this screen could do. */}
        <p className="nf-body-sm mt-block text-[var(--nf-content-muted)]">
          Already on RentMe?{" "}
          <ButtonLink href="/sign-in" variant="ghost" size="sm" className="align-baseline">
            Sign in
          </ButtonLink>
        </p>
      </section>
    </div>
  );
}
