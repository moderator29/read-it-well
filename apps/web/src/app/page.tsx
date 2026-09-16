import Image from "next/image";
import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { HowItWorks } from "@/components/site/landing/HowItWorks";
import { MarketsBand } from "@/components/site/landing/MarketsBand";
import { OneAccountBand } from "@/components/site/landing/OneAccountBand";
import { NextBand } from "@/components/site/landing/NextBand";
import { MoveInTruth } from "@/components/site/landing/MoveInTruth";
import { StandardBand } from "@/components/site/landing/StandardBand";
import { AgentsBand } from "@/components/site/landing/AgentsBand";
import { VoicesBand } from "@/components/site/landing/VoicesBand";
import { FeaturedCarousel } from "@/components/site/landing/FeaturedCarousel";
import { AssistantShowcase } from "@/components/site/landing/SignatureShowcase";
import { gatedHref } from "@/lib/site/gated-href";
import { UiIcon } from "@/design-system/icons/UiIcon";

/*
 * The landing page: a marketplace, stated as one.
 *
 * ---------------------------------------------------------------------------
 * THE MISTAKE THIS VERSION EXISTS TO CORRECT, BECAUSE IT WAS MINE AND IT WAS
 * A BIG ONE.
 * ---------------------------------------------------------------------------
 *
 * The rebuild before this one cut eighteen bands down to seven and built the
 * survivors around the move-in total. That number is a genuine differentiator
 * and the argument for it was sound, but it is A YEARLY TENANCY'S CONCERN, and
 * three of the seven sections were built on it: the truth band, the three
 * steps, and a standard written as light, water and the gate. A stranger read
 * the result and learned that Vallo helps you rent a flat.
 *
 * Vallo is not that. It carries NINE live markets, from a hotel room tonight
 * to a plot of land, with a naira wallet, savings pots, crypto top-ups where
 * they are switched on, an assistant that reads the catalogue in four
 * languages, messaging, a verification ladder and a social layer. The founder
 * said it plainly: somebody arriving should see a marketplace, not one market.
 *
 * A marketplace is defined by BREADTH, and breadth has to be stated rather
 * than implied. So the page now leads with what is here and what the account
 * does, and the move-in total takes its proper place as one proof among
 * several rather than as the spine:
 *
 *   1. The offer, in the hero: the brand line, over the markets, over the
 *      breadth in a sentence.
 *   2. THE MARKETS. Nine of them, with real counts. This is the section that
 *      says "marketplace" and its absence is what broke the last version.
 *   3. Proof there are places: real listings, straight from the catalogue.
 *   4. ONE ACCOUNT: what you can DO here. Wallet, pots, assistant, messages,
 *      verification, records. A marketplace that only lists things is a
 *      noticeboard.
 *   5. The honest number: the move-in total, as a proof of how we operate.
 *   6. How it works, in three verbs.
 *   7. The standard, written for every market rather than for tenancies.
 *   8. Why we exist, and the invitation to list.
 *   9. WHAT IS NEXT, labelled as a plan and obeying strict rules about it.
 *  10. The assistant, the questions, the door.
 *
 * WHAT WAS DELETED, AND WHY IT IS NOT COMING BACK.
 *
 *   `PlatformConsole` published "17+ Verified listings" as a hardcoded string
 *   under a heading that said "the same real numbers", with a hardcoded growth
 *   chart behind it. The true number is zero, enforced by a check constraint.
 *   A section that lies about the product's numbers is not redesigned, it is
 *   removed, and the standing rule is on `VoicesBand`: real rows or nothing.
 *
 *   The 2x2 feature grid ("AI Assistant / Smart help, 24/7") and the trust
 *   strip ("Made for Africa / Built with love") were the most recognisable
 *   template shapes on the page, and two of their claims the database refutes.
 *   What was true in them now lives in sections that show rather than tell.
 *
 *   `StoryRail` was eight panels behind a horizontal gesture, seven gated to
 *   sign-up, with masked renders on white stages that fought both themes. The
 *   hero scenes that replaced its artwork carry their own plinths and sit in
 *   the sections they illustrate instead of in a carousel nobody finished.
 *
 *   `MoodRow` linked six moods that return zero rows, verified by query.
 *   `PopularDestinations`, the categories grid and the facts band repeated
 *   the cities, the markets and the numbers the page already states.
 *
 *   The FAQ kept five questions somebody actually has before joining, and
 *   lost the seven that were padding or that made coverage and launch claims
 *   the product cannot back.
 *
 * EVERY PRODUCT LINK GOES THROUGH `gatedHref`, unchanged. The product is
 * behind a session by design (`middleware.ts` owns the lock), so a marketing
 * link into it is an invitation to join that keeps the destination. Whether
 * strangers should browse the catalogue signed out is a live question in
 * RECOMMENDATIONS.md, but it is a product decision, not a landing page one,
 * and this page does not get to make it by accident.
 */

const CITIES = ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Ibadan"];

/*
 * Five questions a person actually has before creating an account, answered
 * in the product's own voice. The twelve-item version claimed coverage of all
 * 36 states "from day one" and described launch mechanics that read as small
 * print. If a question needs a hedge, it is not landing page material.
 */

export default async function LandingPage() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <>
      <SiteHeader t={t} locale={locale} />

      <main id="main">
        {/* ----------------------------------------------------------- hero */}
        <section className="relative overflow-hidden pb-12 pt-6 sm:pt-10 md:pt-14">
          <div className="nf-aurora" aria-hidden="true" />
          <div className="nf-grid-veil" aria-hidden="true" />

          <div className="nf-shell relative z-10">
            <div className="grid items-center gap-block lg:grid-cols-[1.05fr_0.95fr]">
              <div className="max-w-2xl">
                {/* The marketplace line above, the brand line as the
                    headline. The founder's call, and the reasoning is with
                    the strings in packages/i18n. */}
                <p className="nf-rise nf-overline text-[var(--nf-brand-secondary)]">
                  {t.landing.hero.overline}
                </p>

                <h1 className="nf-display mt-4">
                  <span className="nf-rise block">{t.landing.hero.title1}</span>
                  <span className="nf-rise nf-rise-2 nf-gradient-text nf-shine block">
                    {t.landing.hero.title2}
                  </span>
                </h1>

                <p className="nf-rise nf-rise-3 mt-4 max-w-[46ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)] sm:mt-5">
                  {t.landing.hero.subtitle}
                </p>

                <div className="nf-rise nf-rise-4 mt-7 flex flex-wrap items-center gap-3">
                  <ButtonLink href={gatedHref("/search")} variant="primary" size="lg" className="nf-breathe">
                    {t.landing.hero.searchLabel}
                  </ButtonLink>
                  <ButtonLink href="/agents" variant="secondary" size="lg">
                    {t.landing.cta.secondary}
                  </ButtonLink>
                </div>

                <ul className="nf-rise nf-rise-5 mt-4 flex flex-wrap gap-2">
                  {CITIES.map((city) => (
                    <li key={city}>
                      <Link
                        href={gatedHref(`/search?q=${encodeURIComponent(city)}`)}
                        prefetch
                        className="nf-chip relative z-10"
                      >
                        {city}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/*
               * The hero scene: a real place with a pin, on its own lit
               * plinth. Desktop only. At 390px the hero's job is the offer
               * and the button above the fold, and a 260px scene would push
               * both below it; the scenes appear from the second section on,
               * where a phone reader has already met the words.
               *
               * THIS IS THE ONE OBJECT ON THE PLATFORM THAT BREATHES.
               * `data-breathe` exists for exactly one placement, chosen
               * deliberately, and this is it: 28 seconds, one per cent, on
               * the first thing a visitor sees. Every other scene holds
               * still, which is what keeps this one feeling alive rather
               * than the page feeling busy. The rule and the numbers live
               * in motion.css.
               */}
              <Reveal delay={140} className="hidden lg:block">
                <Image
                  src="/brand/glass/hero/hero-property.png"
                  alt=""
                  aria-hidden="true"
                  data-breathe
                  width={557}
                  height={470}
                  priority
                  sizes="(max-width: 1280px) 400px, 480px"
                  className="nf-story-art mx-auto h-auto w-full max-w-[480px]"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* --------------------------------- the markets: what a marketplace is */}
        <MarketsBand locale={locale} />

        {/* ------------------------------------- proof: places on the shelf */}
        <FeaturedCarousel locale={locale} />

        {/* ------------------------------- one account: what you can DO here */}
        <OneAccountBand t={t} />

        {/* ------------------------------------------- the move-in argument */}
        <MoveInTruth locale={locale} />

        {/* ----------------------------------------------- three verbs */}
        <HowItWorks t={t} />

        {/* ------------------------------------------------- the standard */}
        <StandardBand t={t} />

        {/* ------------------------------------------- why Vallo exists */}
        <section className="relative overflow-hidden py-section">
          <div className="nf-shell relative z-10">
            <div className="grid gap-block lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <Reveal>
                <span className="nf-overline">{t.landing.vision.overline}</span>
                <h2 className="nf-h1 mt-3">{t.landing.vision.title}</h2>
                <p className="mt-4 max-w-[52ch] text-[var(--nf-text-body-lg)] leading-relaxed text-[var(--nf-content-secondary)]">
                  {t.landing.vision.body}
                </p>
              </Reveal>

              <Reveal delay={80}>
                <div className="nf-card p-card-lg">
                  <span className="nf-overline">{t.landing.vision.missionOverline}</span>
                  <h3 className="nf-h3 mt-2">{t.landing.vision.missionTitle}</h3>
                  <p className="mt-3 leading-relaxed text-[var(--nf-content-secondary)]">
                    {t.landing.vision.missionBody}
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <AgentsBand t={t} />

        {/* ---------------------------------- the plan, labelled as a plan */}
        <NextBand t={t} />

        {/* Real voices or nothing: renders null until a real review exists. */}
        <VoicesBand locale={locale} />

        <AssistantShowcase />

        {/* ------------------------------------------------------------- faq */}
        {/*
          THE MARKER WAS A PLUS SIGN, TYPED.
          A literal `+` rotated 45 degrees on open is the one glyph on this page
          that is a text character pretending to be an icon: it takes the body
          font rather than the icon set, it lands on the text baseline rather
          than the optical centre, its weight is whatever Inter decides at
          15px, and a screen reader meets it as a plus. `chevron-down` is the
          same rotation idea in the platform's own stroked set, at a size on
          the scale, and it is `aria-hidden` because `<details>` already
          announces its own state.

          `py-section` rather than `pt-14` with no bottom, which had the last
          row butting into the CTA's own padding.
        */}
        <section className="nf-shell py-section">
          <Reveal className="mb-6 max-w-[52ch]">
            <h2 className="nf-h1">{t.landing.faq.title}</h2>
          </Reveal>
          <div className="space-y-2.5">
            {t.landing.faq.items.map((item) => (
              <Reveal key={item.q}>
                <details className="nf-card group p-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[0.9375rem] font-semibold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <UiIcon
                      name="chevron-down"
                      size={20}
                      aria-hidden
                      className="shrink-0 text-[var(--nf-content-muted)] transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="px-5 pb-4 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {item.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ cta */}
        <section className="nf-shell py-16 sm:pt-20">
          <Reveal>
            <div className="nf-card nf-card--live relative overflow-hidden p-8 text-center sm:p-10 md:p-14">
              <div className="nf-aurora opacity-60" aria-hidden="true" />
              <div className="relative z-10">
                <h2 className="nf-h1 mx-auto max-w-[20ch]">{t.landing.cta.title}</h2>
                <p className="mx-auto mt-4 max-w-[52ch] text-[var(--nf-content-secondary)]">
                  {t.landing.cta.subtitle}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <ButtonLink href="/start" variant="primary" size="lg" className="nf-breathe">
                    {t.landing.cta.action}
                  </ButtonLink>
                  <ButtonLink href="/docs" variant="secondary" size="lg">
                    See how it works
                  </ButtonLink>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter t={t} />
    </>
  );
}
