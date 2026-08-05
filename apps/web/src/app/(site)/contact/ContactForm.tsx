"use client";

import { useActionState } from "react";
import { submitContactForm } from "@/lib/support/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { DEFAULT_CONTACT_TOPIC, type ContactTopic } from "./topics";

/**
 * The public contact form.
 *
 * This used to set a local flag and tell you, honestly, that nothing had been
 * sent. The honesty was real and the note said so before you typed a word, but
 * the write path it apologised for already existed: `fileSupportTicket` has
 * filed anonymous tickets through the service role since support shipped.
 *
 * So it files a real ticket now. The visitor gets an NF-SUP reference on the
 * screen and the same reference by email, and support gets a row in the queue
 * they already work from. Every failure still names the support address, so a
 * paused queue, a missing key or a rate limit leaves a person with somewhere
 * to go rather than a dead form.
 */
export function ContactForm({
  supportEmail,
  defaultTopic = DEFAULT_CONTACT_TOPIC,
}: {
  supportEmail: string;
  defaultTopic?: ContactTopic;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ reference: string }> | null,
    FormData
  >(submitContactForm, null);

  const fieldError = (key: string): string | undefined =>
    state && !state.ok ? state.fieldErrors?.[key] : undefined;

  // ------------------------------------------------------------ filed
  if (state?.ok) {
    return (
      <div className="nf-card p-6 text-center" data-testid="contact-filed">
        <span className="mx-auto grid h-14 w-14 place-items-center">
          <BrandIcon name="support-chat" fill />
        </span>
        <p className="mt-3 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
          Your message is with support
        </p>
        <p className="mx-auto mt-2 max-w-[44ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
          We reply within one business day, Monday to Saturday. Your reference is
          below, and it is in the confirmation email we have just sent you.
        </p>
        <p className="nf-numeric mt-4 inline-block rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] px-4 py-2.5 text-[1.0625rem] font-bold tracking-wide text-[var(--nf-content-primary)]">
          {state.data.reference}
        </p>
        <p className="mt-4 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Need to add something? Reply to that email, or write to{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold text-[var(--nf-electric-300)] hover:underline"
          >
            {supportEmail}
          </a>{" "}
          quoting the reference.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-4" aria-describedby="contact-form-note">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="nf-overline mb-1.5 block">Your name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            className="nf-field"
            placeholder="Amaka Obi"
            aria-invalid={fieldError("name") ? true : undefined}
          />
          {fieldError("name") && (
            <span className="mt-1.5 block text-[0.78rem] text-[var(--nf-state-warning)]">
              {fieldError("name")}
            </span>
          )}
        </label>
        <label className="block">
          <span className="nf-overline mb-1.5 block">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            className="nf-field"
            placeholder="you@example.com"
            aria-invalid={fieldError("email") ? true : undefined}
          />
          {fieldError("email") && (
            <span className="mt-1.5 block text-[0.78rem] text-[var(--nf-state-warning)]">
              {fieldError("email")}
            </span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="nf-overline mb-1.5 block">Topic</span>
        {/*
          The safety topic is first and it is worded as the thing that actually
          happens, not as a category name. The admin support queue reads this
          value back and puts the four-hour clock on the ticket, so choosing it
          changes how fast a person sees it rather than only how it is filed.
        */}
        <select name="topic" className="nf-field" defaultValue={defaultTopic}>
          <option value="safety">Someone asked me to pay outside RentMe</option>
          <option value="booking">A booking</option>
          <option value="payment">A payment or refund</option>
          <option value="listing">Listing a property</option>
          <option value="verification">Verification</option>
          <option value="other">Something else</option>
        </select>
      </label>

      <label className="block">
        <span className="nf-overline mb-1.5 block">Message</span>
        <textarea
          name="message"
          rows={5}
          className="nf-field resize-y"
          placeholder="Tell us what happened, including any booking reference."
          aria-invalid={fieldError("message") ? true : undefined}
        />
        {fieldError("message") && (
          <span className="mt-1.5 block text-[0.78rem] text-[var(--nf-state-warning)]">
            {fieldError("message")}
          </span>
        )}
      </label>

      <button type="submit" disabled={pending} className="nf-btn nf-btn--primary disabled:opacity-60">
        {pending ? "Sending your message..." : "Send message"}
      </button>

      {state && !state.ok ? (
        <p
          id="contact-form-note"
          role="alert"
          className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
        >
          {state.error} You can also email{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold text-[var(--nf-electric-300)] hover:underline"
          >
            {supportEmail}
          </a>{" "}
          directly, and nothing you typed here has been cleared.
        </p>
      ) : (
        <p id="contact-form-note" className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          This opens a support ticket and emails you the reference. If you would rather
          write to us yourself, the address is{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold text-[var(--nf-electric-300)] hover:underline"
          >
            {supportEmail}
          </a>
          .
        </p>
      )}
    </form>
  );
}
