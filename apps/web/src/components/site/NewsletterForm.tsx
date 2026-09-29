"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions/envelope";
import { subscribeToUpdates } from "@/lib/site/newsletter";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The footer's email field. One input, one round submit, and the honest
 * line under it (see lib/site/newsletter.ts for what the submit does).
 */
export function NewsletterForm({
  label,
  placeholder,
  submit,
  note,
  done,
}: {
  label: string;
  placeholder: string;
  submit: string;
  note: string;
  done: string;
}) {
  const [state, action, pending] = useActionState<
    ActionResult<{ reference: string }> | null,
    FormData
  >(subscribeToUpdates, null);

  if (state?.ok) {
    return (
      <p className="nf-body-sm text-[var(--nf-content-secondary)]" role="status">
        {done} <span className="nf-numeric font-semibold">{state.data.reference}</span>
      </p>
    );
  }

  const error = state && !state.ok ? (state.fieldErrors?.email ?? state.error) : null;

  return (
    <form action={action} noValidate className="nf-site-newsletter">
      <label className="sr-only" htmlFor="nf-newsletter-email">
        {label}
      </label>
      <div className="nf-site-newsletter-field">
        <input
          id="nf-newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby="nf-newsletter-note"
          disabled={pending}
        />
        <button type="submit" aria-label={submit} disabled={pending}>
          <UiIcon name="arrow-right" size={20} aria-hidden />
        </button>
      </div>
      {error && (
        <p className="nf-caption mt-inline text-[var(--nf-state-error)]" role="alert">
          {error}
        </p>
      )}
      <p id="nf-newsletter-note" className="nf-caption mt-inline">
        {note}
      </p>
    </form>
  );
}
