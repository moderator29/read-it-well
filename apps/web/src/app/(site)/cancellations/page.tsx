import type { Metadata } from "next";
import { SiteHead } from "@/components/site/SiteHead";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { CancellationTimeline } from "@/lib/trust/CancellationTimeline";
import { FULL_REFUND_HOURS } from "@/lib/trust/cancellation";
import { RESPONSE_COMMITMENTS } from "@/lib/trust/standards";
import { WALLET_MONEY_USES } from "@/lib/wallet/bank-payouts";

export const metadata: Metadata = {
  title: "Cancellation policy",
  description:
    "One cancellation schedule for every paid stay on Vallo: everything back until 72 hours before check-in, half back inside that window, nothing back once check-in day starts. A restaurant table is free to cancel and a tenancy is settled in its own agreement.",
};

/**
 * The cancellation policy.
 *
 * One schedule for the whole platform, deliberately. Per-listing policies are
 * how this category ends up with fourteen variants nobody reads and a dispute
 * queue full of people who genuinely did not know which one applied to them.
 *
 * The timeline itself is `CancellationTimeline`, which reads the schedule from
 * `lib/trust/cancellation.ts` and computes every figure. The same component
 * renders on a listing and on a booking against real dates and a real total,
 * so a guest sees the identical three steps wherever they meet them.
 */

export default function CancellationPolicyPage() {
  return (
    <>
      <SiteHead
        plate="bedroom-02"
        icon="calendar-clock"
        chip="Cancellations"
        title="One cancellation policy, on every stay"
        /* THE LEDE IS THE PROMISE, NOT THE EXCEPTIONS. A2.
           It ran to four sentences and drew NINE CENTRED LINES at 390px, which
           is a wall rather than an opening, and two of those sentences were
           exclusions the page already answers in full further down. The hero
           keeps the promise; the exclusions have their own sections, where
           somebody looking for one will actually find it. */
        lede="Not one policy per agent. The same three steps apply to every stay booked and paid for on Vallo, so you never have to work out which rules you agreed to."
      />
    <div className="nf-shell pb-section">
      <div className="mx-auto max-w-3xl">

        {/* ------------------------------------------------- the timeline */}
        <section className="mt-section" aria-labelledby="the-schedule">
          <h2 id="the-schedule" className="sr-only">
            The schedule
          </h2>
          <CancellationTimeline headingLevel="h3" />
        </section>

        {/* ----------------------------------------------- before you pay */}
        <section className="mt-section" aria-labelledby="before-you-pay">
          <h2 id="before-you-pay" className="nf-h2 text-[1.375rem]">
            Before you have paid
          </h2>
          <div className="nf-panel nf-panel--card block mt-group p-card">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              A reservation you have not paid for is a hold on the calendar and
              nothing more. Cancel it from Bookings, or from Trips on the Stays
              side, at any hour, for nothing, and the nights reopen for somebody
              else immediately. A hold you walk away from releases itself, so you
              cannot accidentally block an agent&apos;s calendar by forgetting
              about it.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------ after you pay */}
        <section className="mt-section" aria-labelledby="after-you-pay">
          <h2 id="after-you-pay" className="nf-h2 text-[1.375rem]">
            After you have paid
          </h2>
          <div className="nf-panel nf-panel--card block mt-group p-card">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Once money has moved, a cancellation is handled by a person rather
              than by a button, because a refund is somebody&apos;s money and it
              deserves a name against the decision. Write to support with your
              booking reference. We apply the schedule above exactly as it is
              written, the refund goes to your Vallo wallet, and you get the
              amount and the reason in writing.
            </p>
            <p className="mt-row text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Cancellation requests are answered{" "}
              <span className="font-semibold text-[var(--nf-content-primary)]">
                {RESPONSE_COMMITMENTS.standard.label.toLowerCase()}
              </span>
              , and sooner when your check-in is close.
            </p>
            <div className="mt-group">
              <ButtonLink href="/contact" variant="primary" size="md">
                Ask support to cancel a paid stay
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* ------------------------------------------- when it is not you */}
        <section className="mt-section" aria-labelledby="not-your-fault">
          <h2 id="not-your-fault" className="nf-h2 text-[1.375rem]">
            When the cancellation is not your doing
          </h2>
          <ul className="mt-group space-y-row">
            <li className="nf-panel nf-panel--card block p-card-sm">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                The agent cancels
              </h3>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                You get everything back, whenever it happens, including inside
                the last <span className="nf-numeric">{FULL_REFUND_HOURS}</span>{" "}
                hours. The schedule above never applies to a cancellation you did
                not choose.
              </p>
            </li>
            <li className="nf-panel nf-panel--card block p-card-sm">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                The place is not what was listed
              </h3>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                Do not cancel. Report it from the listing on the day, with
                photographs if you have them. A misrepresented property is a
                standards matter, not a cancellation, and it is refunded in full
                once a person has looked at it.
              </p>
            </li>
            <li className="nf-panel nf-panel--card block p-card-sm">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                You could not get in
              </h3>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                A gate that will not open, an estate that has no record of you, a
                key nobody brings. Message the agent in the thread so there is a
                time stamp, then report it. Same treatment: full refund once it is
                confirmed.
              </p>
            </li>
          </ul>
        </section>

        {/* --------------------------------------------- restaurant tables */}
        <section className="mt-section" aria-labelledby="tables">
          <h2 id="tables" className="nf-h2 text-[1.375rem]">
            A restaurant table is different
          </h2>
          <div className="nf-panel nf-panel--card block mt-group p-card">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Nothing is taken for a table, so nothing has to come back. You ask
              a restaurant for a date, a time and a party size, and the restaurant
              confirms it or turns it down. Cancel from the reservation at any
              hour, for nothing, and tell them in its own conversation if you are
              simply running late. You pay the restaurant when you eat, and the
              schedule above has nothing to say about any of it.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------ refund route */}
        <section className="mt-section" aria-labelledby="refund-route">
          <h2 id="refund-route" className="nf-h2 text-[1.375rem]">
            Where a refund actually goes
          </h2>
          <div className="nf-panel nf-panel--card block mt-group p-card">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Into your Vallo wallet, in naira, to the kobo, usually within minutes
              of the decision. One wallet serves both sides of the product.{" "}
              {WALLET_MONEY_USES} A refund is not returned to the card it was paid
              with.
            </p>
          </div>
        </section>

        {/* ------------------------------------------- tenancies and sales */}
        {/* THE ONE EXCLUSION THAT HAD NO SECTION. A2. The lede said a tenancy
            is settled in its own agreement and then the page never mentioned
            it again, so the only place that answer existed was a sentence in
            the hero nobody scrolls back up to. */}
        <section className="mt-section" aria-labelledby="tenancies">
          <h2 id="tenancies" className="nf-h2 text-[1.375rem]">
            A tenancy, a sale or a lease is different again
          </h2>
          <div className="nf-panel nf-panel--card block mt-group p-card">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              The schedule above is for stays: a room, a flat or a house taken by
              the night. A year&apos;s rent, a purchase or a commercial lease is
              settled in the agreement you sign with the agent, and the terms in
              that agreement are the ones that apply. Vallo holds the
              conversation, the inspection and the record of what was paid, and it
              does not overwrite what the two of you agreed.
            </p>
          </div>
        </section>

        <p className="mt-block text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Read this next to the{" "}
          <Link
            href="/safety"
            className="font-semibold text-[var(--nf-content-secondary)] hover:underline"
          >
            safety centre
          </Link>{" "}
          and the{" "}
          <Link
            href="/standards"
            className="font-semibold text-[var(--nf-content-secondary)] hover:underline"
          >
            trust and safety standards
          </Link>
          .
        </p>
      </div>
    </div>
    </>
  );
}
