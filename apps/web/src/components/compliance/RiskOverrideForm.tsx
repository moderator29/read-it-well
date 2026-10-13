"use client";

import { useActionState } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { Radio } from "@/components/ui/Check";
import type { ActionResult } from "@/lib/actions/envelope";
import { overrideRiskClass } from "@/lib/compliance/risk-actions";

/** SCUML item 15: staff set a person's risk class by hand, with a reason. Staff only. */
export function RiskOverrideForm({ copy }: { copy: Dictionary["complianceRisk"]["lane"] }) {
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(overrideRiskClass, null);
  const err = state && !state.ok ? state : null;
  return (
    <form action={action} className="grid gap-sm" data-testid="risk-override-form">
      <p className="nf-caption text-[var(--nf-content-muted)]">{copy.overrideHelp}</p>
      <div>
        <label htmlFor="risk-person" className="nf-label block">
          {copy.person}
        </label>
        <input id="risk-person" name="person" required autoComplete="off" className="nf-field mt-xs min-h-[44px] w-full" />
        {err?.fieldErrors?.person ? <p className="nf-caption mt-2xs text-[var(--nf-state-warning)]">{err.fieldErrors.person}</p> : null}
      </div>
      <fieldset>
        <legend className="sr-only">{copy.overrideTitle}</legend>
        <div className="flex flex-wrap gap-xs">
          {(["high", "medium", "low"] as const).map((value) => (
            <Radio key={value} name="riskClass" value={value} required>
              {copy.class[value]}
            </Radio>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="risk-reason" className="nf-label block">
          {copy.reason}
        </label>
        <textarea
          id="risk-reason"
          name="reason"
          required
          minLength={10}
          maxLength={600}
          rows={3}
          aria-describedby="risk-reason-help"
          className="nf-field mt-xs w-full"
        />
        <p id="risk-reason-help" className="nf-caption mt-2xs text-[var(--nf-content-muted)]">
          {copy.reasonHelp}
        </p>
      </div>
      <Button type="submit" variant="primary" loading={pending}>
        {copy.set}
      </Button>
      {state?.ok ? (
        <p role="status" className="nf-caption text-[var(--nf-content-secondary)]">
          {copy.saved}
        </p>
      ) : null}
      {err ? (
        <p role="alert" className="nf-caption text-[var(--nf-state-warning)]">
          {err.error}
        </p>
      ) : null}
    </form>
  );
}
