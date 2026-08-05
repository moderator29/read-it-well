import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support-email";
import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { RESPONSE_COMMITMENTS } from "@/lib/trust/standards";
import { ContactForm } from "./ContactForm";
import { ButtonLink } from "@/components/ui/Button";
import { CONTACT_TOPICS, DEFAULT_CONTACT_TOPIC, type ContactTopic } from "./topics";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach the RentMe support team. Email {SUPPORT_EMAIL} and we reply within one business day.",
};


/**
 * Contact page.
 *
 * The support email is the hero object, with a plain response-time promise
 * next to it. The form below files a real support ticket and hands back its
 * NF-SUP reference, and the help centre is offered first for the questions
 * that already have written answers.
 */

/**
 * `?topic=safety` arrives from the safety centre's report control, so the
 * person who has just read that nobody should ask them to pay outside RentMe
 * does not then have to find the right option in a select. Anything else in
 * that parameter is ignored rather than trusted into the form.
 */
function topicFrom(value: string | string[] | undefined): ContactTopic {
  const first = Array.isArray(value) ? value[0] : value;
  return CONTACT_TOPICS.find((topic) => topic === first) ?? DEFAULT_CONTACT_TOPIC;
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const defaultTopic = topicFrom((await searchParams).topic);

  return (
    <div className="nf-shell py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        {/* -------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="chat" fill />
            </span>
            Contact us
          </span>
          <h1 className="nf-h1 mx-auto mt-5 max-w-[16ch]">Talk to a human</h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-[var(--nf-content-secondary)]">
            Whether it is a booking, a payment, a listing or something odd you spotted,
            the fastest route to a fix is below.
          </p>
        </div>

        {/* ----------------------------------------------- email + promise */}
        <Reveal as="section" className="mt-12">
          <div className="nf-card p-6 text-center sm:p-8">
            <p className="nf-overline">Support email</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="nf-tap mt-2 inline-block break-all text-[1.25rem] font-bold text-[var(--nf-electric-300)] hover:underline sm:text-[1.5rem]"
            >
              {SUPPORT_EMAIL}
            </a>
            <p className="mx-auto mt-4 max-w-[48ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              We reply within one business day, Monday to Saturday. Urgent booking
              problems on the day of check-in are answered first.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="nf-chip">Replies within 24 hours</span>
              <span className="nf-chip">English, Yoruba, Hausa, Igbo</span>
            </div>
          </div>
        </Reveal>

        {/* --------------------------------------------- help centre first */}
        <Reveal as="section" className="mt-6">
          <div className="nf-card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <span className="inline-grid h-13 w-13 shrink-0 place-items-center">
                <BrandIcon name="support-chat" fill />
              </span>
              <p className="text-[0.9375rem] leading-snug text-[var(--nf-content-secondary)]">
                Many questions already have written answers about bookings, payments,
                refunds and listing.
              </p>
            </div>
            <ButtonLink href="/help" variant="secondary" className="shrink-0">
              Browse the help centre
            </ButtonLink>
          </div>
        </Reveal>

        {/* ------------------------------------------------ safety first */}
        <Reveal as="section" className="mt-6">
          <div className="nf-card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <span className="inline-grid h-13 w-13 shrink-0 place-items-center">
                <BrandIcon name="shield-check" fill />
              </span>
              <p className="text-[0.9375rem] leading-snug text-[var(--nf-content-secondary)]">
                Asked to pay into an account, or to move the conversation off
                RentMe? Say so in the form below and we answer within{" "}
                <span className="nf-numeric">{RESPONSE_COMMITMENTS.urgent.hours}</span>{" "}
                hours.
              </p>
            </div>
            <Link href="/safety" className="nf-btn nf-btn--glass shrink-0">
              Safety centre
            </Link>
          </div>
        </Reveal>

        {/* -------------------------------------------------------- form */}
        <Reveal as="section" className="mt-12">
          <h2 className="nf-overline text-center">Or write to us here</h2>
          <div className="nf-card mt-4 p-5 sm:p-7">
            <ContactForm supportEmail={SUPPORT_EMAIL} defaultTopic={defaultTopic} />
          </div>
        </Reveal>

        {/* ------------------------------------------------ other routes */}
        <Reveal as="section" className="mt-12">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="nf-card p-5">
              <p className="nf-overline">Careers</p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                Applications and anything hiring related go to{" "}
                <a href="mailto:careers@naijafinds.com" className="font-semibold text-[var(--nf-electric-300)] hover:underline">
                  careers@naijafinds.com
                </a>
                .
              </p>
            </div>
            <div className="nf-card p-5">
              <p className="nf-overline">Agents</p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                Applying to list, or checking on an application? Start at{" "}
                <Link href="/agents" className="font-semibold text-[var(--nf-electric-300)] hover:underline">
                  Become an agent
                </Link>
                .
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
