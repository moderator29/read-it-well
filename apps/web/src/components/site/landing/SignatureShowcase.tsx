import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { gatedHref } from "@/lib/site/gated-href";

/*
 * `VillaShowcase` AND `CoverageMap` STOOD HERE AND ARE DELETED.
 *
 * Neither was imported anywhere, and each carried a line this repository has
 * spent two days removing from live surfaces: the villa panel's headline was
 * the retired slogan, and the coverage panel said "All 36 states. One lit
 * map." over a catalogue that lives in five cities. Dead code is where retired
 * copy hides from a sweep, so they go rather than wait to be rediscovered by
 * the next person who needs a section and imports the first export they find.
 */

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
    <section className="nf-shell py-section" aria-labelledby="nf-assistant-title">
      <Reveal>
        <div className="nf-card overflow-hidden p-0 lg:grid lg:grid-cols-[1fr_1.02fr]">
          <div className="relative order-last min-h-[240px] sm:min-h-[340px] lg:order-first lg:min-h-0">
            {/* The RentMe assistant render stood here, 1.9MB. Replaced with
                the commissioned bot object on the brand ground. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 grid place-items-center bg-[var(--nf-surface-artwork)]"
            >
              {/* The commissioned hero scene: the assistant holding a listing
                  card, on its own lit plinth. A scene, not an icon, which is
                  why it is an Image from `glass/hero` rather than a BrandIcon:
                  the icon set must never carry hero artwork, or a call site
                  will one day paint this at 24px. */}
              <Image
                src="/brand/glass/hero/hero-assistant.png"
                alt=""
                width={557}
                height={470}
                sizes="(max-width: 1024px) 320px, 460px"
                className="nf-float-slow h-auto w-full max-w-[460px]"
              />
            </div>
            {/*
              THE SCRIM STOOD HERE AND IS GONE, and it had to go with the
              photograph rather than after it.

              It was a raw `rgb(1 1 24 / 0.55)` gradient, the one
              `nf/no-raw-colour` error in this file, and the lint message names
              exactly what it did: "a literal cannot follow the theme, and this
              is how dark-only treatments reach daylight". Its job was to darken
              the foot of a full-bleed photograph so the type beside it could be
              read. There is no photograph now, the object sits on the artwork
              ground in its own grid cell, and the type is in the next cell, so
              the scrim was darkening nothing and blackening the light theme.
            */}
          </div>

          <div className="flex flex-col items-start justify-center p-card-lg lg:p-2xl">
            <span className="nf-overline">Vallo AI</span>
            <h2 id="nf-assistant-title" className="nf-h1 mt-row">
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
