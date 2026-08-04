"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlaceFields, type PlaceValues } from "@/components/app/place/PlaceFields";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { updatePlaceAction, type PlaceSaved } from "@/lib/places/actions";
import type { StateOption } from "@/lib/places/reference";
import type { ActionResult } from "@/lib/actions/envelope";

/**
 * Where you are, and what you do, as one save.
 *
 * The three fields move together because the database checks them together: a
 * local government has to sit inside the state on the same row, and a trigger
 * refuses the pair with SQLSTATE RM020 when it does not. Saving them one at a
 * time would make that refusal unavoidable halfway through.
 *
 * The form keeps whatever was chosen when a save is refused, so nothing has to
 * be picked twice, and it re-renders from what the database handed back rather
 * than from what the form hoped for.
 */
export function PlaceForm({
  states,
  initial,
  initialLabels,
}: {
  states: StateOption[];
  initial: PlaceValues;
  initialLabels: { lgaName: string; occupationName: string };
}) {
  const router = useRouter();
  const [values, setValues] = useState<PlaceValues>(initial);
  const [saved, setSaved] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<PlaceSaved> | null, FormData>(
    updatePlaceAction,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;
    setValues({
      stateCode: state.data.stateCode,
      lgaCode: state.data.lgaCode,
      occupationCode: state.data.occupationCode,
    });
    setSaved(true);
    router.refresh();
    const timer = window.setTimeout(() => setSaved(false), 4000);
    return () => window.clearTimeout(timer);
  }, [state, router]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="nf-card p-5 sm:p-6" data-testid="place-form">
      <PlaceFields
        states={states}
        value={values}
        onChange={setValues}
        fieldErrors={fieldErrors}
        initialLabels={initialLabels}
      />

      {state && !state.ok && (
        <p
          role="alert"
          data-testid="place-error"
          className="mt-5 rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]"
        >
          {state.error}
        </p>
      )}

      {saved && (
        <p
          role="status"
          data-testid="place-saved"
          className="nf-rise mt-5 flex items-center gap-2 text-[0.8125rem] text-[var(--nf-state-success)]"
        >
          <UiIcon name="verified" size={16} className="shrink-0" />
          Saved. Home now opens on this city.
        </p>
      )}

      <button type="submit" disabled={pending} className="nf-btn nf-btn--primary mt-5 w-full">
        {pending ? "Saving..." : "Save"}
      </button>

      <p className="mt-3 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        Your state and local government decide which places home opens on. Your
        occupation is shown on your public profile only if you put it there.
      </p>
    </form>
  );
}
