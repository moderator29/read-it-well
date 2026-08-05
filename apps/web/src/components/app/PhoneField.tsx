"use client";

import { useId } from "react";
import { maskNational, readPhone, type PhoneReading } from "@/lib/phone";

/**
 * A Nigerian mobile number field.
 *
 * WHAT IT FIXES. Every phone input on the platform was a bare text box that
 * accepted anything and said "Enter a valid Nigerian phone number." only after
 * the form came back from the server. Two separate rules decided what valid
 * meant and they disagreed (see `lib/phone.ts`). Nothing anywhere told the
 * person what shape was wanted, and eleven unbroken digits is not a thing
 * anybody can check by eye, so the commonest failure was a transposed pair
 * that reached the host as an unreachable number and was discovered at the
 * gate.
 *
 * THREE THINGS, IN ORDER OF HOW MUCH THEY MATTER:
 *
 * 1. The country code is stated and is not typeable. `+234` sits beside the
 *    box as text, so the field is unambiguous about what it wants and there is
 *    no way to half-type a country code. Somebody who pastes `+234803...` or
 *    `0803...` anyway gets the same result: the paste is normalised, not
 *    refused. A form that rejects a correctly copied number is worse than one
 *    that never mentioned the format.
 *
 * 2. It groups as you type: `803 123 4567`. That is how the number is read
 *    aloud, and it makes a wrong digit visible.
 *
 * 3. It names the network as soon as it can. An unrecognised range is said to
 *    be unrecognised rather than refused, because the NCC issues new ranges
 *    and a shipped allow-list goes stale; `lib/phone.ts` argues that out in
 *    full.
 *
 * SUBMISSION. The visible box carries the `name` and posts the masked national
 * digits, `803 123 4567`.
 *
 * The first version of this posted a canonical `+234...` from a hidden field
 * beside a nameless visible one, on the reasoning that the server should not
 * have to re-derive anything. That was wrong twice over. It broke the contract
 * every other field on the platform keeps, that the input you can see is the
 * input that posts, which a spec caught immediately by no longer being able to
 * type into the field. And it was pointless: the server already runs
 * `normalisePhone` on whatever arrives, and `normalisePhone("803 123 4567")`
 * is `+2348031234567`, because the masked form is one of the six shapes it
 * was written to accept. Two sources for one value, where one of them was
 * already sufficient, is exactly the arrangement that drifts.
 */

export type PhoneFieldProps = {
  /** Field name the FORM posts. The visible input is nameless. */
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  /** A message from the server that outranks anything worked out here. */
  error?: string | undefined;
  /** Sentence under the field explaining what the number is used for. */
  hint?: string | undefined;
  required?: boolean;
  autoComplete?: string;
  id?: string;
};

function advice(reading: PhoneReading): { tone: "muted" | "error"; text: string } | null {
  switch (reading.state) {
    case "empty":
      return null;
    case "incomplete":
      /* Counting DOWN rather than up: "three more digits" is an instruction,
         "seven of ten" is a status report the person has to do sums on. */
      return {
        tone: "muted",
        text: `${10 - reading.digits} more ${10 - reading.digits === 1 ? "digit" : "digits"} to go.`,
      };
    case "invalid":
      return { tone: "error", text: reading.reason };
    case "valid":
      return reading.carrier
        ? { tone: "muted", text: `${reading.carrier} number.` }
        : {
            tone: "muted",
            text: "We do not recognise that network, but the number is the right shape, so it will be saved as typed.",
          };
  }
}

export function PhoneField({
  name,
  label,
  value,
  onChange,
  error,
  hint,
  required,
  autoComplete = "tel",
  id,
}: PhoneFieldProps) {
  const generated = useId();
  const fieldId = id ?? `${generated}-phone`;
  const noteId = `${fieldId}-note`;

  const reading = readPhone(value);
  const note = advice(reading);
  /* The server's word beats ours: it has seen things this field has not. */
  const shown = error ? { tone: "error" as const, text: error } : note;
  const invalid = Boolean(error) || reading.state === "invalid";

  return (
    <div>
      <label htmlFor={fieldId} className="nf-label">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        {/*
          `aria-hidden`, because the code is announced as part of the input's
          own description instead. A screen reader hitting a stray "+234" as a
          separate stop before the field would be reading furniture.
        */}
        <span
          aria-hidden="true"
          className="nf-field flex w-[4.25rem] shrink-0 items-center justify-center text-[var(--nf-content-muted)]"
        >
          +234
        </span>
        <input
          id={fieldId}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          /* Ten digits plus two spaces. A paste longer than this is still
             accepted, because `maskNational` trims it to the ten that matter
             rather than silently keeping the wrong end. */
          maxLength={12}
          value={maskNational(value)}
          onChange={(event) => onChange(maskNational(event.target.value))}
          placeholder="803 123 4567"
          aria-describedby={noteId}
          aria-invalid={invalid ? true : undefined}
          required={required}
          className="nf-field min-w-0 flex-1"
        />
      </div>

      <p
        id={noteId}
        role={shown?.tone === "error" ? "alert" : undefined}
        className={`mt-1.5 text-[0.78rem] leading-relaxed ${
          shown?.tone === "error"
            ? "text-[var(--nf-state-error)]"
            : "text-[var(--nf-content-muted)]"
        }`}
      >
        {shown ? shown.text : (hint ?? "")}
      </p>
    </div>
  );
}
