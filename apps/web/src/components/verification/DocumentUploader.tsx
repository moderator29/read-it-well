"use client";

import { useId, useRef, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import {
  ACCEPTED_LABEL,
  ACCEPTED_MIME,
  DOCUMENT_SPECS,
  MAX_FILE_LABEL,
  rejectFile,
  type DocumentKind,
} from "./kyc";

export type ChosenFile = { name: string; size: number; type: string };

/**
 * One document, asked for properly.
 *
 * Four things are printed on this control BEFORE anything is chosen, and every
 * one of them is a thing that otherwise becomes an error message after a failed
 * upload on a metered connection:
 *
 *   1. WHICH DOCUMENTS QUALIFY, by name. Not "government issued ID" - a
 *      passport, a driver's licence, a NIN slip, a voter's card. Somebody
 *      holding a NIN slip and reading "government issued ID" does not know
 *      whether they have one.
 *   2. THE ACCEPTED FILE TYPES.
 *   3. THE SIZE LIMIT, as a number with a unit.
 *   4. THE ONE THING PEOPLE GET WRONG. For an address document that is the
 *      three-month rule, which is the single most common rejection reason in
 *      every KYC flow that has one and is almost never stated up front.
 *
 * The file is checked in the browser the moment it is chosen and refused with a
 * sentence that says what to do instead. Nothing leaves the device until the
 * flow is submitted, so a person who picks the wrong file has spent no data at
 * all finding out.
 */
export function DocumentUploader({
  kind,
  file,
  onChange,
}: {
  kind: DocumentKind;
  file: ChosenFile | null;
  onChange: (file: ChosenFile | null) => void;
}) {
  const spec = DOCUMENT_SPECS[kind];
  const inputId = useId();
  const input = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(chosen: File | undefined) {
    if (!chosen) return;
    const refusal = rejectFile(chosen);
    if (refusal) {
      setError(refusal);
      onChange(null);
      return;
    }
    setError(null);
    onChange({ name: chosen.name, size: chosen.size, type: chosen.type });
  }

  return (
    <section className="nf-card p-4 sm:p-5">
      <h3 className="text-[1rem] font-semibold text-[var(--nf-content-primary)]">{spec.title}</h3>

      <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        {spec.qualifies}
      </p>

      {/* The rule that gets people refused, said before they upload. */}
      <p className="mt-2 flex items-start gap-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
        <UiIcon name="verified" size="sm" className="mt-0.5 shrink-0" />
        <span>{spec.caution}</span>
      </p>

      <input
        ref={input}
        id={inputId}
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        className="sr-only"
        onChange={(event) => pick(event.target.files?.[0])}
      />

      {file ? (
        <div className="mt-4 flex items-center gap-3 rounded-[var(--nf-radius-lg)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-secondary)] px-3.5 py-3">
          <span className="nf-role-mark" aria-hidden="true">
            <UiIcon name="document" size="md" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.875rem] font-medium text-[var(--nf-content-primary)]">
              {file.name}
            </span>
            <span className="nf-numeric block text-[0.75rem] text-[var(--nf-content-muted)]">
              {Math.max(1, Math.round(file.size / 1024))} KB
            </span>
          </span>
          {/* Replace, not just remove. The person is here to supply a document,
              so the useful control is the one that gets them to a better
              photograph rather than back to an empty box. */}
          <Button variant="ghost" size="sm" onClick={() => input.current?.click()}>
            {REPLACE}
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="md"
          full
          className="mt-4"
          leadingIcon="plus"
          onClick={() => input.current?.click()}
        >
          {CHOOSE}
        </Button>
      )}

      {/* The limits, always visible, never only inside an error. */}
      <p className="mt-2 text-[0.75rem] text-[var(--nf-content-muted)]">
        {ACCEPTED_LABEL}. {LIMIT_PREFIX} {MAX_FILE_LABEL}.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </section>
  );
}

const CHOOSE = "Choose a file";
const REPLACE = "Replace";
const LIMIT_PREFIX = "Up to";
