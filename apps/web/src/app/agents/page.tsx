import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Reveal } from "@/components/site/Reveal";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";

export const metadata: Metadata = {
  title: "Become an Agent",
  description:
    "List your properties on NaijaFinds, reach verified guests, manage bookings and get paid securely.",
};

/**
 * Become an Agent pitch.
 *
 * The page is a single narrative: hero promise, the three things you get, the
 * six application steps (a vertical timeline on phones, a 3x2 grid on
 * desktop), an earnings tease, then trust notes answering the questions every
 * applicant actually has. Every section rises in on scroll via Reveal.
 *
 * Copy comes from the dictionary wherever a key exists (t.agent.join,
 * t.agent.apply.steps, t.agent.status.reviewNote); the step blurbs, earnings
 * card and trust notes have no keys yet so they are plain English here.
 */
export default async function BecomeAgentPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const j = t.agent.join;
  const steps = t.agent.apply.steps;

  const stepList: { n: number; icon: IconName; label: string; blurb: string }[] = [
    { n: 1, icon: "profile", label: steps.personal, blurb: "Tell us who you are. Two minutes, no paperwork yet." },
    { n: 2, icon: "verified", label: steps.identity, blurb: "Verify with your NIN or a government issued ID." },
    { n: 3, icon: "apartment", label: steps.business, blurb: "Solo agent or registered company, both are welcome." },
    { n: 4, icon: "booking", label: steps.documents, blurb: "Upload your ID, and registration if you run a business." },
    { n: 5, icon: "wallet", label: steps.payout, blurb: "Add the Nigerian bank account your earnings should land in." },
    { n: 6, icon: "star", label: steps.review, blurb: "Check everything over, submit, and we take it from there." },
  ];

  const benefits: { icon: IconName; text: string }[] = [
    { icon: "verified", text: j.benefitReach },
    { icon: "apartment", text: j.benefitTools },
    { icon: "wallet", text: j.benefitEarn },
  ];

  const trustNotes: { q: string; a: string }[] = [
    {
      q: "How long does approval take?",
      // The canonical review promise already exists in the status vocabulary.
      a: t.agent.status.reviewNote,
    },
    {
      q: "What do I need to apply?",
      a: "A government issued ID, your bank details and photos of your property. Business agents also upload their registration.",
    },
    {
      q: "Does it cost anything to list?",
      a: "No. Listing is free. NaijaFinds earns a small commission only when a booking completes, so we only do well when you do.",
    },
    {
      q: "When do I get paid?",
      a: "Payouts go straight to the Nigerian bank account you add during the application, after each completed stay.",
    },
  ];

  return (
    <>
      <SiteHeader t={t} locale={locale} />

      <main id="main" className="nf-shell py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          {/* ------------------------------------------------------- hero */}
          <div className="nf-rise text-center">
            <span className="nf-chip mx-auto">
              <span className="inline-grid h-4 w-4 place-items-center">
                <Icon name="apartment" fill />
              </span>
              {t.landing.footer.becomeAgent}
            </span>
            <h1 className="nf-h1 mx-auto mt-5 max-w-[18ch]">{j.title}</h1>
            <p className="mx-auto mt-3 max-w-[52ch] text-[var(--nf-content-secondary)]">{j.body}</p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/agents/apply" className="nf-btn nf-btn--primary nf-btn--lg">
                {j.start}
                <UiIcon name="arrow-right" size={18} />
              </Link>
              {/* No dictionary key exists for a status check yet, so plain
                  English until one lands. */}
              <Link href="/agents/status" className="nf-btn nf-btn--glass nf-btn--lg">
                Check application status
              </Link>
            </div>
          </div>

          {/* -------------------------------------------------- what you get */}
          <Reveal as="section" className="mt-14">
            <h2 className="nf-overline text-center">{j.whatYouGet}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {benefits.map((b, i) => (
                <Reveal key={b.text} as="li" delay={i * 80} className="h-full">
                  <div className="nf-card flex h-full items-center gap-3 p-4 sm:flex-col sm:items-start sm:gap-2.5 sm:p-5">
                    <span className="inline-grid h-10 w-10 shrink-0 place-items-center">
                      <Icon name={b.icon} fill />
                    </span>
                    <span className="text-[0.875rem] font-medium leading-snug">{b.text}</span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </Reveal>

          {/* ------------------------------------------------------- steps */}
          <Reveal as="section" className="mt-14">
            <h2 className="nf-overline text-center">Six steps, one sitting</h2>
            <p className="mx-auto mt-2 max-w-[46ch] text-center text-[0.875rem] text-[var(--nf-content-muted)]">
              Your progress saves as you go, so you can pause and pick up where you left off.
            </p>

            {/* One markup, two shapes: a connector line between cards makes it
                a vertical timeline on phones; the connector hides at sm and
                the same cards flow into a 3x2 grid. */}
            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stepList.map((s, i) => (
                <Reveal key={s.n} as="li" delay={(i % 3) * 80} className="relative h-full">
                  {i < stepList.length - 1 && (
                    <span
                      className="absolute left-[2.375rem] top-full h-4 w-px bg-[var(--nf-border-subtle)] sm:hidden"
                      aria-hidden="true"
                    />
                  )}
                  <div className="nf-card flex h-full items-start gap-4 p-5">
                    <span
                      className="nf-numeric grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.875rem] font-bold text-white"
                      style={{ background: "var(--nf-gradient-agent)" }}
                    >
                      {s.n}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-snug">{s.label}</span>
                      <span className="mt-1 block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                        {s.blurb}
                      </span>
                    </span>
                  </div>
                </Reveal>
              ))}
            </ol>
          </Reveal>

          {/* ----------------------------------------------- earnings tease */}
          <Reveal as="section" className="mt-14">
            <div className="nf-card overflow-hidden p-6 sm:p-8">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
                <span className="inline-grid h-16 w-16 shrink-0 place-items-center sm:h-20 sm:w-20">
                  <Icon name="wallet" fill />
                </span>
                <div className="min-w-0">
                  <h2 className="nf-h3">You set the price. You keep the earnings.</h2>
                  <p className="mt-2 max-w-[52ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
                    Set your own nightly rates, watch bookings arrive in your dashboard, and
                    withdraw to any Nigerian bank. No listing fees, ever.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="nf-chip">Free to list</span>
                    <span className="nf-chip">Secure payouts</span>
                    <span className="nf-chip">Live earnings dashboard</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* -------------------------------------------------- trust notes */}
          <Reveal as="section" className="mt-14">
            <h2 className="nf-overline text-center">Good to know</h2>
            <div className="mt-4 space-y-3">
              {trustNotes.map((n, i) => (
                <Reveal key={n.q} delay={i * 60}>
                  <div className="nf-card p-5">
                    <h3 className="flex items-center gap-2.5 font-semibold">
                      <span className="inline-grid h-5 w-5 shrink-0 place-items-center">
                        <Icon name="help" fill />
                      </span>
                      {n.q}
                    </h3>
                    <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                      {n.a}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          {/* --------------------------------------------------- final call */}
          <Reveal as="section" className="mt-14">
            <div className="nf-card p-7 text-center sm:p-9">
              <span className="mx-auto inline-grid h-14 w-14 place-items-center">
                <Icon name="apartment" fill />
              </span>
              <h2 className="nf-h2 mx-auto mt-4 max-w-[20ch]">{j.title}</h2>
              <div className="mt-6 flex justify-center">
                <Link href="/agents/apply" className="nf-btn nf-btn--primary nf-btn--lg">
                  {j.start}
                  <UiIcon name="arrow-right" size={18} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </main>

      <SiteFooter t={t} />
    </>
  );
}
