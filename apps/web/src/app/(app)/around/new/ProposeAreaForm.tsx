"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TextField, SelectField, TextArea } from "@/components/ui/Field";
import { proposeArea } from "@/lib/social/areas-actions";
import {
  AREA_COPY,
  AREA_KINDS,
  AREA_KIND_HINT,
  AREA_KIND_LABEL,
  slugifyArea,
  type AreaKind,
} from "@/lib/social/areas-schema";
import { displayHost } from "@/lib/brand-domain";

/**
 * Suggest a place.
 *
 * The owner's rule: somebody who cannot find a conversation about Gwagwalada
 * makes one, we approve it by hand, and only then is it public. So this form
 * never pretends to open anything. It says plainly that a person reads it, and
 * the success state is honest about waiting rather than dressed up as done.
 *
 * The web address is shown as it is typed rather than asked for, because a slug
 * somebody chooses is a slug somebody squats, and a slug that surprises its
 * author gets reported as a bug.
 */
export function ProposeAreaForm({
  states,
  signedIn,
}: {
  states: { code: string; name: string }[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState<AreaKind>("AREA");
  const [stateCode, setStateCode] = useState("");
  const [blurb, setBlurb] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const slug = slugifyArea(city, name);

  if (done) {
    return (
      <div className="nf-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--nf-state-success-surface)]">
          <UiIcon name="verified" size={22} className="text-[var(--nf-state-success)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--nf-content-primary)]">
          Thank you. We have it.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--nf-content-muted)]">
          {AREA_COPY.proposePending}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="nf-btn nf-btn--primary"
            /* The directory, not the feed: the suggestion just made is printed
               there under "Waiting on us", so this is the one screen that can
               show the person what they have done. */
            onClick={() => router.push("/around/settings")}
          >
            Back to your places
          </button>
          <button
            type="button"
            className="nf-btn nf-btn--ghost"
            onClick={() => {
              setDone(false);
              setName("");
              setCity("");
              setBlurb("");
            }}
          >
            Suggest another
          </button>
        </div>
      </div>
    );
  }

  const submit = () => {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await proposeArea({ name, kind, stateCode, city, blurb });
      if (result.ok) {
        setDone(true);
        router.refresh();
        return;
      }
      setError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
    });
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) submit();
      }}
    >
      {!signedIn ? (
        <p className="nf-card border-[var(--nf-border-brand)] p-4 text-sm leading-relaxed text-[var(--nf-content-secondary)]">
          Sign in first and we will keep what you type here.
        </p>
      ) : null}

      <TextField
        label="What do people call it?"
        value={name}
        maxLength={60}
        placeholder="Gwagwalada"
        onChange={(event) => setName(event.target.value)}
        error={fieldErrors.name}
        hint="The name people actually say, not the official one."
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-[var(--nf-content-primary)]">
          What kind of place is it?
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {AREA_KINDS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              aria-pressed={kind === option}
              className={`rounded-[var(--nf-radius-md)] bg-[var(--nf-surface-primary)] p-3 text-left transition-colors ${
                kind === option
                  ? "border-2 border-[var(--nf-brand-primary)] shadow-[var(--nf-glow-accent)]"
                  : "border-2 border-[var(--nf-border-default)]"
              }`}
            >
              <span
                className={`block text-sm font-semibold ${
                  kind === option
                    ? "text-[var(--nf-brand-primary)]"
                    : "text-[var(--nf-content-primary)]"
                }`}
              >
                {AREA_KIND_LABEL[option]}
              </span>
              <span className="mt-1 block text-xs leading-snug text-[var(--nf-content-muted)]">
                {AREA_KIND_HINT[option]}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="State"
          value={stateCode}
          onChange={(event) => setStateCode(event.target.value)}
          error={fieldErrors.stateCode}
        >
          <option value="">Choose a state</option>
          {states.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </SelectField>

        <TextField
          label="City or town"
          value={city}
          maxLength={60}
          placeholder="Abuja"
          onChange={(event) => setCity(event.target.value)}
          error={fieldErrors.city}
        />
      </div>

      <TextArea
        label="One line about it"
        optionalText="(optional)"
        value={blurb}
        maxLength={200}
        rows={3}
        placeholder="Off the expressway, past the university gate."
        onChange={(event) => setBlurb(event.target.value)}
        hint={`${blurb.length}/200`}
      />

      {slug ? (
        <p className="rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-inset)] px-3 py-2 text-xs text-[var(--nf-content-muted)]">
          Its address will be{" "}
          <span className="nf-numeric text-[var(--nf-content-secondary)]">
            {displayHost()}/around/{slug}
          </span>
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-[var(--nf-content-muted)]">
        {AREA_COPY.proposeWhy}
      </p>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--nf-radius-md)] border border-[var(--nf-state-error)] bg-[var(--nf-state-error-surface)] px-3 py-2 text-sm text-[var(--nf-content-primary)]"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="nf-btn nf-btn--primary w-full"
        disabled={pending || !signedIn}
      >
        {pending ? "Sending" : "Suggest this place"}
      </button>
    </form>
  );
}
