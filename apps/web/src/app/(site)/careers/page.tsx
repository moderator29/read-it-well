import type { Metadata } from "next";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Help build the platform Nigerians use to find, book and live. See how we work at RentMe and send a speculative application.",
};

/**
 * Careers page.
 *
 * Culture first, then an honest empty state for open roles: there are none
 * listed yet, so instead of fake vacancies the page invites speculative
 * applications to careers@naijafinds.com and says exactly what to send.
 */
export default function CareersPage() {
  const culture: { icon: BrandIconName; title: string; body: string }[] = [
    {
      icon: "house-sparkle",
      title: "Nigeria is the brief",
      body: "We design for NEPA outages, bank transfer receipts and four languages, not for an imagined user in another country. Local knowledge is a superpower here.",
    },
    {
      icon: "shield-check",
      title: "Trust is the product",
      body: "Verification, secure payments and honest reviews are not compliance chores. They are the whole point, and everyone on the team owns them.",
    },
    {
      icon: "chat",
      title: "Small team, big ownership",
      body: "You will ship things users touch in your first weeks. Clear writing, kind disagreement and finished work matter more than titles.",
    },
    {
      icon: "luggage-check",
      title: "Craft over churn",
      body: "We would rather build one screen properly than five screens roughly. Design, engineering and support sit in the same conversations.",
    },
  ];

  const wanted = [
    "Engineers who care about performance on mid-range Android phones",
    "Designers who can make trust visible in an interface",
    "Operations and support people who love untangling real problems",
    "Writers and translators fluent in Yoruba, Hausa or Igbo",
  ];

  return (
    <div className="nf-shell py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* -------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="reviews" fill />
            </span>
            Careers at RentMe
          </span>
          <h1 className="nf-h1 mx-auto mt-5 max-w-[18ch]">
            Build the way Nigeria books
          </h1>
          <p className="mx-auto mt-4 max-w-[54ch] text-[var(--nf-content-secondary)]">
            We are a small team building the platform Nigerians use to find, book and
            live: verified stays, food and experiences, in four languages. If that
            sounds like your kind of problem, we want to hear from you.
          </p>
        </div>

        {/* ----------------------------------------------- how we work */}
        <Reveal as="section" className="mt-14">
          <h2 className="nf-overline text-center">How we work</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {culture.map((c, i) => (
              <Reveal key={c.title} delay={(i % 2) * 80} className="h-full">
                <div className="nf-card flex h-full flex-col gap-3 p-5 sm:p-6">
                  <span className="inline-grid h-13 w-13 place-items-center">
                    <BrandIcon name={c.icon} fill />
                  </span>
                  <span className="font-semibold">{c.title}</span>
                  <span className="text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    {c.body}
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* -------------------------------------- open roles, empty state */}
        <Reveal as="section" className="mt-14">
          <h2 className="nf-overline text-center">Open roles</h2>
          <div className="nf-card mt-4 p-7 text-center sm:p-9">
            <span className="mx-auto inline-grid h-16 w-16 place-items-center">
              <BrandIcon name="home-search" fill />
            </span>
            <h3 className="nf-h3 mx-auto mt-4 max-w-[26ch]">
              No advertised openings right now
            </h3>
            <p className="mx-auto mt-3 max-w-[52ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              We hire in small, deliberate waves, and the next one has not been posted
              yet. But we always read speculative applications, and several people on
              the team arrived exactly that way.
            </p>

            <div className="mx-auto mt-6 max-w-md rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] p-4 text-left">
              <p className="nf-overline">Send us</p>
              <ul className="mt-2 space-y-1.5 text-[0.875rem] text-[var(--nf-content-secondary)]">
                <li className="flex items-start gap-2">
                  <UiIcon name="arrow-right" size={16} className="mt-1 shrink-0 text-[var(--nf-brand-primary)]" />
                  A short note on what you would improve about RentMe
                </li>
                <li className="flex items-start gap-2">
                  <UiIcon name="arrow-right" size={16} className="mt-1 shrink-0 text-[var(--nf-brand-primary)]" />
                  A CV, portfolio or links to work you are proud of
                </li>
                <li className="flex items-start gap-2">
                  <UiIcon name="arrow-right" size={16} className="mt-1 shrink-0 text-[var(--nf-brand-primary)]" />
                  The kind of role you are looking for
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <ButtonLink
                href="mailto:careers@naijafinds.com"
                variant="primary"
                size="lg"
                trailingIcon="arrow-right"
              >
                Email careers@naijafinds.com
              </ButtonLink>
            </div>
            <p className="mt-3 text-[0.8125rem] text-[var(--nf-content-muted)]">
              We reply to every serious application, usually within a week.
            </p>
          </div>
        </Reveal>

        {/* ---------------------------------------------- who we look for */}
        <Reveal as="section" className="mt-14">
          <h2 className="nf-overline text-center">People we are always curious about</h2>
          <ul className="mt-4 space-y-3">
            {wanted.map((w, i) => (
              <Reveal key={w} as="li" delay={i * 60}>
                <div className="nf-card flex items-center gap-4 p-4 sm:p-5">
                  <span className="inline-grid h-13 w-13 shrink-0 place-items-center">
                    <BrandIcon name="user-check" fill />
                  </span>
                  <span className="text-[0.9375rem] font-medium leading-snug">{w}</span>
                </div>
              </Reveal>
            ))}
          </ul>
        </Reveal>

        {/* ------------------------------------------------- cross links */}
        <Reveal as="section" className="mt-14">
          <div className="nf-card p-6 text-center sm:p-8">
            <p className="text-[0.9375rem] text-[var(--nf-content-secondary)]">
              Not looking for a job, but want to earn on RentMe?
            </p>
            <div className="mt-4 flex justify-center">
              <ButtonLink href="/agents" variant="secondary">
                Become an agent instead
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
