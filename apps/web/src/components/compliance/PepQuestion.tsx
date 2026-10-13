"use client";

import { useActionState, useState } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { formatDate } from "@vallo/i18n/core";
import { Button } from "@/components/ui/Button";
import { Radio } from "@/components/ui/Check";
import type { ActionResult } from "@/lib/actions/envelope";
import { answerPepQuestion } from "@/lib/compliance/pep-actions";

/**
 * SCUML item 20: the PEP question, asked of LISTERS at verification and at
 * payout account setup. The server decides who sees it (`readMyPepAnswer`
 * answers "not-asked" for a member looking for a home) and the database
 * refuses anybody without an agents row.
 *
 * What the person reads back is the date they last answered and nothing
 * else: not the answer, not a flag, not a review. Once answered it folds to
 * that line, with a way to answer again if anything changes.
 */
export function PepQuestion({
  copy,
  locale,
  answeredAt,
  askedAt,
}: {
  copy: Dictionary["compliancePep"]["question"];
  locale: Locale;
  answeredAt: string | null;
  askedAt: "verification" | "payout";
}) {
  const [state, action, pending] = useActionState<ActionResult<null> | null, FormData>(answerPepQuestion, null);
  const [open, setOpen] = useState(answeredAt === null);
  const [answer, setAnswer] = useState<"" | "yes" | "no">("");
  const saved = state?.ok === true;
  const id = `pep-${askedAt}`;

  if (!open || saved) {
    const when = saved ? new Date() : answeredAt ? new Date(answeredAt) : null;
    return (
      <section className="nf-panel nf-panel--card mb-block block p-card" data-testid="pep-answered" aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`} className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
          {copy.title}
        </h2>
        <p className="nf-body-sm mt-inline-tight text-[var(--nf-content-secondary)]" role={saved ? "status" : undefined}>
          {saved ? copy.saved : null}
          {saved ? " " : null}
          {when ? copy.answered.replace("{date}", formatDate(when, locale)) : null}
        </p>
        <div className="mt-group">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setOpen(true);
              setAnswer("");
            }}
          >
            {copy.again}
          </Button>
        </div>
      </section>
    );
  }

  const err = state && !state.ok ? state : null;
  return (
    <form action={action} className="nf-panel nf-panel--card mb-block block p-card" data-testid="pep-question" aria-labelledby={`${id}-title`}>
      <input type="hidden" name="askedAt" value={askedAt} />
      <h2 id={`${id}-title`} className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
        {copy.title}
      </h2>
      <p className="nf-body-sm mt-inline-tight leading-relaxed text-[var(--nf-content-muted)]">{copy.body}</p>

      <fieldset className="mt-group">
        <legend className="nf-label mb-inline">{copy.legend}</legend>
        <div className="flex flex-wrap gap-xs">
          {(["no", "yes"] as const).map((value) => (
            <Radio key={value} name="isPep" value={value} checked={answer === value} onChange={() => setAnswer(value)}>
              {value === "yes" ? copy.yes : copy.no}
            </Radio>
          ))}
        </div>
        {err?.fieldErrors?.isPep ? <p className="nf-caption mt-2xs text-[var(--nf-state-warning)]">{err.fieldErrors.isPep}</p> : null}
      </fieldset>

      {answer === "yes" ? (
        <div className="mt-group grid gap-sm">
          <fieldset>
            <legend className="nf-label mb-inline">{copy.who}</legend>
            <div className="flex flex-wrap gap-xs">
              {(["self", "family", "associate"] as const).map((value) => (
                <Radio key={value} name="relation" value={value}>
                  {copy[value]}
                </Radio>
              ))}
            </div>
            {err?.fieldErrors?.relation ? (
              <p className="nf-caption mt-2xs text-[var(--nf-state-warning)]">{err.fieldErrors.relation}</p>
            ) : null}
          </fieldset>
          <div>
            <label htmlFor={`${id}-role`} className="nf-label block">
              {copy.role}
            </label>
            <input
              id={`${id}-role`}
              name="role"
              maxLength={200}
              placeholder={copy.rolePlaceholder}
              className="nf-field mt-xs min-h-[44px] w-full"
              aria-invalid={err?.fieldErrors?.role ? true : undefined}
            />
            {err?.fieldErrors?.role ? <p className="nf-caption mt-2xs text-[var(--nf-state-warning)]">{err.fieldErrors.role}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="mt-group">
        <Button type="submit" variant="primary" full loading={pending} disabled={answer === ""}>
          {pending ? copy.saving : copy.save}
        </Button>
      </div>
      {err && !err.fieldErrors ? (
        <p role="alert" className="nf-caption mt-sm text-[var(--nf-state-warning)]">
          {err.error}
        </p>
      ) : null}
    </form>
  );
}
