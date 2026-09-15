import { SUPPORT_EMAIL, SUPPORT_IS_EMAIL } from "@/lib/support-email";
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
    /* This printed the fifteen characters {SUPPORT_EMAIL} into the page
       description, which is what a search result and a shared link show. */
    "Reach the Vallo support team. Send us a message and we reply within one business day.",
};


/**
 * Contact page.
 *
 * The support email is the hero object, with a plain response-time promise
 * next to it. The form below files a real support ticket and hands back its
 * VAL-SUP reference, and the help centre is offered first for the questions
 * that already have written answers.
 */

/**
 * `?topic=safety` arrives from the safety centre's report control, so the
 * person who has just read that nobody should ask them to pay outside Vallo
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
    <div className="nf-shell py-section">
      <div className="mx-auto max-w-3xl">
        {/* -------------------------------------------------------- hero */}
        <div className="nf-rise text-center">
          <span className="nf-chip mx-auto">
            <span className="inline-grid h-4 w-4 place-items-center">
              <BrandIcon name="chat" fill />
            </span>
            Contact us
          </span>
          <h1 className="nf-h1 mx-auto mt-heading max-w-[16ch]">Talk to a human</h1>
          <p className="mx-auto mt-group max-w-[52ch] text-[var(--nf-content-secondary)]">
            Whether it is a booking, a payment, a listing or something odd you spotted,
            the fastest route to a fix is below.
          </p>
        </div>

        {/* ------------------------------------------------ the promise */}
        <Reveal as="section" className="mt-section">
          <div className="nf-card p-card text-center-lg">
            {/*
              The hero used to be a large mailto to support@rentme.ng, a
              mailbox that does not exist, sitting directly above a form that
              works. It offered a dead route in the largest type on the page
              and the live one underneath it in the smallest.

              The address returns here on its own the moment
              NEXT_PUBLIC_SUPPORT_EMAIL names a real one. Until then the
              promise is the hero, because the promise is the true part.
            */}
            {SUPPORT_IS_EMAIL ? (
              <>
                <p className="nf-overline">Support email</p>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="nf-tap mt-inline inline-block break-all text-[1.25rem] font-bold text-[var(--nf-content-link)] hover:underline sm:text-[1.5rem]"
                >
                  {SUPPORT_EMAIL}
                </a>
              </>
            ) : (
              <>
                <p className="nf-overline">Talk to a person</p>
                <p className="mt-inline text-[1.25rem] font-bold text-[var(--nf-content-primary)] sm:text-[1.5rem]">
                  Send us a message
                </p>
              </>
            )}
            <p className="mx-auto mt-group max-w-[48ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
              We reply within one business day, Monday to Saturday. Urgent booking
              problems on the day of check-in are answered first.
            </p>
            <div className="mt-heading flex flex-wrap items-center justify-center gap-inline">
              <span className="nf-chip">Replies within 24 hours</span>
              <span className="nf-chip">English, Yoruba, Hausa, Igbo</span>
            </div>
          </div>
        </Reveal>

        {/* --------------------------------------------- help centre first */}
        <Reveal as="section" className="mt-heading">
          <div className="nf-card flex flex-col items-start gap-group p-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-group">
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
        <Reveal as="section" className="mt-heading">
          <div className="nf-card flex flex-col items-start gap-group p-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-group">
              <span className="inline-grid h-13 w-13 shrink-0 place-items-center">
                <BrandIcon name="shield-check" fill />
              </span>
              <p className="text-[0.9375rem] leading-snug text-[var(--nf-content-secondary)]">
                Asked to pay into an account, or to move the conversation off
                Vallo? Say so in the form below and we answer within{" "}
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
        <Reveal as="section" className="mt-section">
          <h2 className="nf-overline text-center">Or write to us here</h2>
          <div className="nf-card mt-group p-card">
            <ContactForm defaultTopic={defaultTopic} />
          </div>
        </Reveal>

        {/* ------------------------------------------------ other routes */}
        <Reveal as="section" className="mt-section">
          <div className="grid gap-heading sm:grid-cols-2">
            <div className="nf-card p-card">
              <p className="nf-overline">Careers</p>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                Applications and anything hiring related go through the form
                above. Put Careers in the topic and it reaches the same queue.
              </p>
            </div>
            <div className="nf-card p-card">
              <p className="nf-overline">Agents</p>
              <p className="mt-inline text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
                Applying to list, or checking on an application? Start at{" "}
                <Link href="/agents" className="font-semibold text-[var(--nf-content-link)] hover:underline">
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
