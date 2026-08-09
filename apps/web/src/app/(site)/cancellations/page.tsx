import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { CancellationTimeline } from "@/lib/trust/CancellationTimeline";
import { FULL_REFUND_HOURS } from "@/lib/trust/cancellation";
import { RESPONSE_COMMITMENTS } from "@/lib/trust/standards";

export const metadata: Metadata = {
  title: "Cancellation policy",
  description:
    "One cancellation schedule for every stay on RentMe: everything back until 72 hours before check-in, half back inside that window, nothing back once check-in day starts.",
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
    <div className="nf-shell py-section">
      <div className="mx-auto max-w-3xl">
        {/* ---------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="calendar-clock" fill />
            </span>
            Cancellations
          </span>
          <h1 className="nf-h1 mx-auto mt-heading max-w-[18ch]">
            One cancellation policy, on every listing
          </h1>
          <p className="mx-auto mt-group max-w-[52ch] text-[var(--nf-content-secondary)]">
            Not one policy per host. The same three steps apply to every stay on
            RentMe, so you never have to work out which rules you agreed to.
          </p>
        </div>

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
          <div className="nf-card mt-group p-card">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              A reservation you have not paid for is a hold on the calendar and
              nothing more. Cancel it from Bookings at any hour, for nothing, and
              the nights reopen for somebody else immediately. A hold you simply
              walk away from releases itself, so you cannot accidentally block a
              host&apos;s calendar by forgetting about it.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------ after you pay */}
        <section className="mt-section" aria-labelledby="after-you-pay">
          <h2 id="after-you-pay" className="nf-h2 text-[1.375rem]">
            After you have paid
          </h2>
          <div className="nf-card mt-group p-card">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Once money has moved, a cancellation is handled by a person rather
              than by a button, because a refund is somebody&apos;s money and it
              deserves a name against the decision. Write to support with your
              booking reference. We apply the schedule above exactly as it is
              written, the refund goes to your RentMe wallet, and you get the
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
            <li className="nf-card p-card-sm">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                The host cancels
              </h3>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                You get everything back, whenever it happens, including inside
                the last <span className="nf-numeric">{FULL_REFUND_HOURS}</span>{" "}
                hours. The schedule above never applies to a cancellation you did
                not choose.
              </p>
            </li>
            <li className="nf-card p-card-sm">
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
            <li className="nf-card p-card-sm">
              <h3 className="text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                You could not get in
              </h3>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                A gate that will not open, an estate that has no record of you, a
                key nobody brings. Message the host in the thread so there is a
                time stamp, then report it. Same treatment: full refund once it is
                confirmed.
              </p>
            </li>
          </ul>
        </section>

        {/* ------------------------------------------------ refund route */}
        <section className="mt-section" aria-labelledby="refund-route">
          <h2 id="refund-route" className="nf-h2 text-[1.375rem]">
            Where a refund actually goes
          </h2>
          <div className="nf-card mt-group p-card">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Into your RentMe wallet, in naira, to the kobo. That is the fastest
              route available in this market and it is not a store credit: move it
              to your Nigerian bank account from the wallet whenever you want, or
              spend it on your next stay. Card reversals are slower and depend on
              your bank, which is why they are not the default.
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
  );
}
