import Image from "next/image";
import Link from "next/link";
import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { HowItWorks } from "@/components/site/landing/HowItWorks";
import { MoveInTruth } from "@/components/site/landing/MoveInTruth";
import { StandardBand } from "@/components/site/landing/StandardBand";
import { AgentsBand } from "@/components/site/landing/AgentsBand";
import { VoicesBand } from "@/components/site/landing/VoicesBand";
import { FeaturedCarousel } from "@/components/site/landing/FeaturedCarousel";
import { AssistantShowcase } from "@/components/site/landing/SignatureShowcase";
import { gatedHref } from "@/lib/site/gated-href";

/*
 * The landing page: seven ideas, in the order a stranger needs them.
 *
 * IT WAS EIGHTEEN BANDS AND 10,862 PIXELS AT 390PX, roughly thirteen phone
 * screens, and the audit's verdict was blunt: a landing page that says
 * everything says nothing. The first four seconds taught a visitor that a
 * company called Vallo existed and liked itself, because the h1 was the
 * slogan; they did not learn that there are properties, what one costs, or
 * where. This rewrite makes the page say ONE thing per section and stop:
 *
 *   1. The offer, in the hero: rent, buy or sell, the move-in total printed.
 *   2. Proof there are places: real listings, straight from the catalogue.
 *   3. The argument: the rent is not the price, and we print the price.
 *   4. How it works, in three verbs.
 *   5. The standard: light, water, gate, a person checked, everything inside.
 *   6. Why we exist, and the invitation to list.
 *   7. The assistant, then the door.
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
const FAQ: [string, string][] = [
  [
    "Is my payment safe?",
    "Payments run in naira through a licensed Nigerian payment provider, and your card details never touch our servers. You are never charged before you confirm.",
  ],
  [
    "Is there a booking fee?",
    "No. The price on a listing is the price, and the move-in total is printed in full before you commit to anything.",
  ],
  [
    "Can I list my property?",
    "Yes. Apply from Become an agent in about ten minutes. A person reviews every application by hand, and only approved agents can publish.",
  ],
  [
    "Which languages does Vallo speak?",
    "English, Yorùbá, Hausa and Igbo, switchable at any time, and the assistant answers in all four.",
  ],
  [
    "What happens after I book?",
    "You get an instant confirmation with the details, the conversation with the agent stays in your account, and reminders arrive as your date approaches.",
  ],
];

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

        {/* ------------------------------------- proof: places on the shelf */}
        <FeaturedCarousel locale={locale} />

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

        {/* Real voices or nothing: renders null until a real review exists. */}
        <VoicesBand locale={locale} />

        <AssistantShowcase />

        {/* ------------------------------------------------------------- faq */}
        <section className="nf-shell pt-14">
          <Reveal className="mb-6 max-w-[52ch]">
            <h2 className="nf-h1">Questions, answered</h2>
          </Reveal>
          <div className="space-y-2.5">
            {FAQ.map(([q, a]) => (
              <Reveal key={q}>
                <details className="nf-card group p-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[0.9375rem] font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="text-[var(--nf-content-muted)] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-4 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {a}
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
