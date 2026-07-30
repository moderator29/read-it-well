"use client";

import { useState } from "react";

/**
 * Contact form stub.
 *
 * Deliberately not wired to a backend yet, and honest about it: the note under
 * the button says so before you type a word, and submitting shows the same
 * truth with the support address instead of pretending a message was sent.
 * When the messaging backend lands, the submit handler is the only thing that
 * needs to change.
 */
export function ContactForm({ supportEmail }: { supportEmail: string }) {
  const [attempted, setAttempted] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setAttempted(true);
      }}
      className="space-y-4"
      aria-describedby="contact-form-note"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="nf-overline mb-1.5 block">Your name</span>
          <input type="text" name="name" autoComplete="name" className="nf-field" placeholder="Amaka Obi" />
        </label>
        <label className="block">
          <span className="nf-overline mb-1.5 block">Email</span>
          <input type="email" name="email" autoComplete="email" className="nf-field" placeholder="you@example.com" />
        </label>
      </div>

      <label className="block">
        <span className="nf-overline mb-1.5 block">Topic</span>
        <select name="topic" className="nf-field" defaultValue="booking">
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
        />
      </label>

      <button type="submit" className="nf-btn nf-btn--primary">
        Send message
      </button>

      {attempted ? (
        <p
          id="contact-form-note"
          role="status"
          className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] p-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
        >
          This form is not connected to our inbox yet, so nothing was sent. Please email{" "}
          <a href={`mailto:${supportEmail}`} className="font-semibold text-[var(--nf-electric-300)] hover:underline">
            {supportEmail}
          </a>{" "}
          instead. Copy your message before leaving the page.
        </p>
      ) : (
        <p id="contact-form-note" className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Honest note: this form is not connected to our inbox yet. For a guaranteed
          reply, email{" "}
          <a href={`mailto:${supportEmail}`} className="font-semibold text-[var(--nf-electric-300)] hover:underline">
            {supportEmail}
          </a>{" "}
          directly.
        </p>
      )}
    </form>
  );
}
