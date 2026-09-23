"use client";

import { useId, useRef, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { ICON_PLATE_GLYPH, IconPlate } from "@/components/ui/IconPlate";
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
    <section className="nf-panel nf-panel--card block p-md sm:p-lg">
      <h3 className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">{spec.title}</h3>

      <p className="mt-2xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
        {spec.qualifies}
      </p>

      {/* The rule that gets people refused, said before they upload. */}
      <p className="mt-xs flex items-start gap-2xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
        <UiIcon name="verified" size="sm" className="mt-3xs shrink-0" />
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
        <div className="nf-panel nf-panel--card mt-md flex-row items-center gap-sm px-md py-sm">
          <IconPlate size="md">
            <UiIcon name="document" size={ICON_PLATE_GLYPH.md} />
          </IconPlate>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[length:var(--nf-text-body-sm)] font-medium text-[var(--nf-content-primary)]">
              {file.name}
            </span>
            <span className="nf-numeric block text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              {Math.max(1, Math.round(file.size / 1024))} KB
            </span>
          </span>
          {/* Replace, not just remove. The person is here to supply a document,
              so the useful control is the one that gets them to a better
              photograph rather than back to an empty box. */}
          <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
            {REPLACE}
          </Button>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="md"
          full
          className="mt-md"
          leadingIcon="plus"
          onClick={() => input.current?.click()}
        >
          {CHOOSE}
        </Button>
      )}

      {/* The limits, always visible, never only inside an error. */}
      <p className="mt-xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
        {ACCEPTED_LABEL}. {LIMIT_PREFIX} {MAX_FILE_LABEL}.
      </p>

      {error && (
        <p role="alert" className="mt-xs text-[length:var(--nf-text-caption)] text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </section>
  );
}

const CHOOSE = "Choose a file";
const REPLACE = "Replace";
const LIMIT_PREFIX = "Up to";
