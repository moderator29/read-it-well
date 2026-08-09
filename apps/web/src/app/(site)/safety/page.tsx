import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { CancellationTimeline } from "@/lib/trust/CancellationTimeline";
import { NEVER_ASK, NO_FEES_LINE, RESPONSE_COMMITMENTS } from "@/lib/trust/standards";
import { REPORT_CATEGORY_COPY, REPORT_CATEGORY_ORDER } from "@/lib/reports/schema";

export const metadata: Metadata = {
  title: "Safety centre",
  description:
    "How payments work on RentMe, how inspections work, what we will never ask you for, and how to report someone who asks you to pay outside the platform.",
};

/**
 * The safety centre.
 *
 * The platform's most important rule is that RentMe charges no fees and that
 * nobody should ever be asked to pay outside it. Until this page existed that
 * rule was enforced in three places nobody can see: a database trigger that
 * flags account numbers in messages, a scanner that holds posts and listings
 * naming one, and an admin queue where staff act on both. The person actually
 * being asked for money had nowhere to read any of it.
 *
 * So this page says it in the plainest words available, before anyone needs
 * it. Every claim on it is something the platform genuinely does today: no
 * promise of an escrow that is not built, no response time the console cannot
 * keep, and no refund window that the cancellation schedule does not compute.
 */

const PAYING_STEPS: { title: string; body: string }[] = [
  {
    title: "You never pay a person, you pay the platform",
    body: "Every payment on RentMe goes through the checkout screen with a licensed Nigerian payment processor, using a card, a bank transfer raised by the processor, or your RentMe wallet. There is no other way to pay for a stay here, and there is no step where somebody sends you an account number.",
  },
  {
    title: "The price you agree is the price you pay",
    body: `${NO_FEES_LINE} The total you see before you confirm is the nightly rate and the cleaning charge the host set, and nothing else is added at the end. If your bank or card network takes something of their own, that is theirs and it is named as theirs.`,
  },
  {
    title: "There is a record, permanently",
    body: "Every payment writes a reference against your booking that you can open from Bookings and from your wallet. If anything goes wrong, that reference is what a person on our side works from. A transfer you made to somebody's personal account has no such record and cannot be traced by us.",
  },
  {
    title: "Money comes back to your wallet first",
    body: "A refund lands in your RentMe wallet, which is the fastest route we have, and you move it to your bank from there whenever you want.",
  },
];

const INSPECTION_STEPS: { title: string; body: string }[] = [
  {
    title: "Message first",
    body: "Open the listing and message the agent. Ask about light, water, the road, the gate and anything else that matters to you. Keep the whole conversation on RentMe: it is scanned for account numbers and payment wording, and it is the record if there is ever a dispute.",
  },
  {
    title: "Then inspect",
    body: "For a rental, view the property before any money moves, in person or on a video call. Bring somebody with you if you can, and go in daylight. An agent who will not let you inspect before paying is telling you something.",
  },
  {
    title: "Confirm the inspection in the thread",
    body: "Both sides can record that the inspection happened, in the conversation itself. That record sits with the booking, so nobody can later claim a viewing that did not happen.",
  },
  {
    title: "Only then, pay on RentMe",
    body: "Rent is message, inspect, then pay. There is no reserve button on a rental for exactly that reason. Never hand over cash at a viewing, and never pay an inspection fee, a holding fee or an agency fee to anybody.",
  },
];

export default function SafetyCentrePage() {
  return (
    <div className="nf-shell py-section">
      <div className="mx-auto max-w-3xl">
        {/* ---------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="shield-check" fill />
            </span>
            Safety centre
          </span>
          <h1 className="nf-h1 mx-auto mt-heading max-w-[18ch]">
            Nobody on RentMe should ever ask you to pay outside it
          </h1>
          <p className="mx-auto mt-group max-w-[52ch] text-[var(--nf-content-secondary)]">
            How payments work here, how inspections work, what we will never ask
            you for, and what to do the moment somebody asks you for money off
            the platform.
          </p>
        </div>

        {/* ------------------------------------------------- the one rule */}
        <section className="nf-card mt-section p-card" aria-labelledby="one-rule">
          <span className="nf-overline">The rule that matters most</span>
          <h2 id="one-rule" className="nf-h2 mt-inline text-[1.375rem]">
            {NO_FEES_LINE}
          </h2>
          <p className="mt-row text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            We take nothing from your booking and nothing from an agent&apos;s
            earnings. So there is no honest reason for anyone to send you an
            account number, and if somebody does, they are not doing platform
            business. Report them and stop replying.
          </p>
          <div className="mt-group flex flex-wrap gap-row">
            <ButtonLink href="/contact?topic=safety" variant="primary" size="md">
              Report someone
            </ButtonLink>
            <ButtonLink href="/standards" variant="secondary" size="md">
              Our standards and response times
            </ButtonLink>
          </div>
        </section>

        {/* -------------------------------------- what we never ask you for */}
        <section className="mt-section" aria-labelledby="never-ask">
          <h2 id="never-ask" className="nf-h2 text-[1.375rem]">
            What RentMe will never ask you for
          </h2>
          <p className="mt-inline text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            Four things. If a message, a call or an email asks you for any of
            them, it is not us, whatever it looks like.
          </p>
          <ul className="mt-group space-y-row">
            {NEVER_ASK.map((item) => (
              <li key={item.title} className="nf-card p-card-sm">
                <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                  {item.title}
                </h3>
                <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* -------------------------------------------- how payments work */}
        <section className="mt-section" aria-labelledby="how-payments">
          <h2 id="how-payments" className="nf-h2 text-[1.375rem]">
            How paying on RentMe works
          </h2>
          <ol className="mt-group space-y-row">
            {PAYING_STEPS.map((step, index) => (
              <li key={step.title} className="nf-card p-card-sm">
                <span className="nf-overline">
                  Step <span className="nf-numeric">{index + 1}</span>
                </span>
                <h3 className="mt-inline-tight text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                  {step.title}
                </h3>
                <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ----------------------------------------- how inspections work */}
        <section className="mt-section" aria-labelledby="how-inspections">
          <h2 id="how-inspections" className="nf-h2 text-[1.375rem]">
            How inspections work
          </h2>
          <p className="mt-inline text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            Renting a place you have never seen is how most people lose money in
            this market. The order below is the whole defence, and it costs
            nothing.
          </p>
          <ol className="mt-group space-y-row">
            {INSPECTION_STEPS.map((step, index) => (
              <li key={step.title} className="nf-card p-card-sm">
                <span className="nf-overline">
                  Step <span className="nf-numeric">{index + 1}</span>
                </span>
                <h3 className="mt-inline-tight text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                  {step.title}
                </h3>
                <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ----------------------------------------------- cancellations */}
        <section className="mt-section" aria-labelledby="cancelling">
          <h2 id="cancelling" className="nf-h2 text-[1.375rem]">
            If your plans change
          </h2>
          <div className="mt-group">
            <CancellationTimeline headingLevel="h3" />
          </div>
          <p className="mt-row text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            The same schedule is shown on every listing and on your booking,
            against your own dates and your own total.{" "}
            <Link
              href="/cancellations"
              className="font-semibold text-[var(--nf-content-secondary)] hover:underline"
            >
              Read the full cancellation policy
            </Link>
            .
          </p>
        </section>

        {/* --------------------------------------------- how to report */}
        <section className="mt-section" aria-labelledby="how-to-report">
          <h2 id="how-to-report" className="nf-h2 text-[1.375rem]">
            How to report something
          </h2>
          <p className="mt-inline text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
            Every listing carries a report control, and the contact form reaches
            the same queue. You do not need proof and you will not be charged
            for being wrong. These are the reasons you can choose from, and they
            are the same words the queue is sorted by.
          </p>
          <ul className="mt-group space-y-inline">
            {REPORT_CATEGORY_ORDER.map((category) => (
              <li key={category} className="nf-card p-card-sm">
                <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                  {REPORT_CATEGORY_COPY[category].label}
                </h3>
                <p className="mt-inline-tight text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                  {REPORT_CATEGORY_COPY[category].hint}
                </p>
              </li>
            ))}
          </ul>

          <div className="nf-card mt-heading p-card">
            <span className="nf-overline">What happens next</span>
            <p className="mt-inline text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              A report about being asked to pay outside RentMe, or about anything
              unsafe, is answered{" "}
              <span className="font-semibold text-[var(--nf-content-primary)]">
                {RESPONSE_COMMITMENTS.urgent.label.toLowerCase()}
              </span>
              . Everything else is answered{" "}
              <span className="font-semibold text-[var(--nf-content-primary)]">
                {RESPONSE_COMMITMENTS.standard.label.toLowerCase()}
              </span>
              . A listing can be taken out of search while we look at it, and the
              person who reported it is never named to the person reported.
            </p>
            <div className="mt-group flex flex-wrap gap-row">
              <ButtonLink href="/contact?topic=safety" variant="primary" size="md">
                Report it now
              </ButtonLink>
              <ButtonLink href="/standards" variant="secondary" size="md">
                What we promise
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* --------------------------------- if you already paid outside */}
        <section className="mt-section" aria-labelledby="already-paid">
          <h2 id="already-paid" className="nf-h2 text-[1.375rem]">
            If you have already paid someone outside RentMe
          </h2>
          <ol className="mt-group space-y-row">
            <li className="nf-card p-card-sm">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                Tell your bank today, not tomorrow
              </h3>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                A Nigerian bank can sometimes place a lien on a receiving account
                if you report a fraudulent transfer quickly. Call your bank first,
                before anything else, and ask them to raise a dispute on the
                transfer.
              </p>
            </li>
            <li className="nf-card p-card-sm">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                Then report it here
              </h3>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                Send us the listing link, the account details you were given and
                the messages. We cannot recover money that never came through the
                platform, and we will not pretend otherwise, but we can remove the
                account, hold the listing, and stop the same person from doing it
                to the next person.
              </p>
            </li>
            <li className="nf-card p-card-sm">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                Keep everything
              </h3>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                Screenshots, the account number, the phone number, the transfer
                receipt. Do not delete the conversation. If the police or your
                bank ask, that is the file.
              </p>
            </li>
          </ol>
        </section>

        {/* ------------------------------------------------------- close */}
        <div className="nf-card mt-section-tight flex flex-col items-start gap-group p-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-group">
            <span className="inline-grid h-13 w-13 shrink-0 place-items-center">
              <BrandIcon name="support-shield" fill />
            </span>
            <p className="text-[0.9375rem] leading-snug text-[var(--nf-content-secondary)]">
              Not sure whether something is a scam? Ask us before you pay, not
              after.
            </p>
          </div>
          <ButtonLink href="/contact" variant="primary" size="md" className="shrink-0">
            Contact support
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
