"use client";

import { useActionState } from "react";
import { submitContactForm } from "@/lib/support/actions";
import type { ActionResult } from "@/lib/actions/envelope";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { Button } from "@/components/ui/Button";
import { SUPPORT_EMAIL, SUPPORT_IS_EMAIL } from "@/lib/support-email";
import {
  CONTACT_TOPICS,
  CONTACT_TOPIC_LABEL,
  DEFAULT_CONTACT_TOPIC,
  type ContactTopic,
} from "./topics";

/**
 * The public contact form.
 *
 * This used to set a local flag and tell you, honestly, that nothing had been
 * sent. The honesty was real and the note said so before you typed a word, but
 * the write path it apologised for already existed: `fileSupportTicket` has
 * filed anonymous tickets through the service role since support shipped.
 *
 * So it files a real ticket now. The visitor gets a VAL-SUP reference on the
 * screen and the same reference by email, and support gets a row in the queue
 * they already work from. Every failure still names the support address, so a
 * paused queue, a missing key or a rate limit leaves a person with somewhere
 * to go rather than a dead form.
 */
export function ContactForm({
  defaultTopic = DEFAULT_CONTACT_TOPIC,
}: {
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
      <div className="nf-card p-card text-center" data-testid="contact-filed">
        <span className="mx-auto grid h-14 w-14 place-items-center">
          <BrandIcon name="support-chat" fill />
        </span>
        <p className="mt-row text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
          Your message is with support
        </p>
        <p className="mx-auto mt-inline max-w-[44ch] text-[0.9375rem] leading-relaxed text-[var(--nf-content-secondary)]">
          We reply within one business day, Monday to Saturday. Your reference is
          below, and it is in the confirmation email we have just sent you.
        </p>
        <p className="nf-numeric mt-group inline-block rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] px-group py-inline text-[1.0625rem] font-bold tracking-wide text-[var(--nf-content-primary)]">
          {state.data.reference}
        </p>
        <p className="mt-group text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          {SUPPORT_IS_EMAIL ? (
            <>
              Need to add something? Reply to that email, or write to{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-[var(--nf-content-link)] hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              quoting the reference.
            </>
          ) : (
            <>Need to add something? Reply to that email, quoting the reference.</>
          )}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-group" aria-describedby="contact-form-note">
      <div className="grid gap-heading sm:grid-cols-2">
        <label className="block">
          <span className="nf-overline mb-inline block">Your name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            className="nf-field"
            placeholder="Amaka Obi"
            aria-invalid={fieldError("name") ? true : undefined}
          />
          {fieldError("name") && (
            <span className="mt-inline block text-[0.78rem] text-[var(--nf-state-warning)]">
              {fieldError("name")}
            </span>
          )}
        </label>
        <label className="block">
          <span className="nf-overline mb-inline block">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            className="nf-field"
            placeholder="you@example.com"
            aria-invalid={fieldError("email") ? true : undefined}
          />
          {fieldError("email") && (
            <span className="mt-inline block text-[0.78rem] text-[var(--nf-state-warning)]">
              {fieldError("email")}
            </span>
          )}
        </label>
      </div>

      <label className="block">
        <span className="nf-overline mb-inline block">Topic</span>
        {/*
          The safety topic is first and it is worded as the thing that actually
          happens, not as a category name. The admin support queue reads this
          value back and puts the four-hour clock on the ticket, so choosing it
          changes how fast a person sees it rather than only how it is filed.
        */}
        <select name="topic" className="nf-field" defaultValue={defaultTopic}>
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {CONTACT_TOPIC_LABEL[topic]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="nf-overline mb-inline block">Message</span>
        <textarea
          name="message"
          rows={5}
          className="nf-field resize-y"
          placeholder="Tell us what happened, including any booking reference."
          aria-invalid={fieldError("message") ? true : undefined}
        />
        {fieldError("message") && (
          <span className="mt-inline block text-[0.78rem] text-[var(--nf-state-warning)]">
            {fieldError("message")}
          </span>
        )}
      </label>

      {/* The primitive owns the disabled + spinner state; the copy is main's. */}
      <Button type="submit" variant="primary" loading={pending}>
        {pending ? "Sending your message..." : "Send message"}
      </Button>

      {state && !state.ok ? (
        <p
          id="contact-form-note"
          role="alert"
          className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] p-row text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
        >
          {state.error}
          {SUPPORT_IS_EMAIL ? (
            <>
              {" "}You can also email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-[var(--nf-content-link)] hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>{" "}
              directly, and nothing you typed here has been cleared.
            </>
          ) : (
            <> Nothing you typed here has been cleared, so try again in a moment.</>
          )}
        </p>
      ) : (
        <p id="contact-form-note" className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          {/* No "or write to us at" line without a mailbox to write to. This
              form opens a real support_tickets row that an admin works in the
              console, so it is the channel, not the fallback. */}
          This opens a support ticket and emails you the reference.
          {SUPPORT_IS_EMAIL ? (
            <>
              {" "}If you would rather write to us yourself, the address is{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-[var(--nf-content-link)] hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </>
          ) : null}
        </p>
      )}
    </form>
  );
}
