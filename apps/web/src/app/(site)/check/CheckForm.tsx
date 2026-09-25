"use client";

import { useActionState, useId } from "react";
import { formatDate, type Dictionary, type Locale } from "@vallo/i18n/core";
import { Button, ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ActionResult } from "@/lib/actions/envelope";
import { checkAgent, type CheckOutcome } from "@/lib/doors/agent-check-actions";

type CheckCopy = Dictionary["trustDoors"]["check"];

/**
 * The check itself. One field, one button, and the answer drawn under it in
 * words and an icon, never colour alone: a tick and the agent's name for yes,
 * a stop mark and "do not pay them anything" for no.
 */
export function CheckForm({ copy, locale, initial }: { copy: CheckCopy; locale: Locale; initial: string }) {
  const fieldId = useId();
  const [state, action, pending] = useActionState<ActionResult<CheckOutcome> | null, FormData>(checkAgent, null);

  return (
    <div className="mt-md">
      <form action={action} className="grid gap-sm">
        <label htmlFor={fieldId} className="nf-label">
          {copy.label}
        </label>
        <input
          id={fieldId}
          name="query"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          defaultValue={initial}
          placeholder={copy.placeholder}
          className="nf-field"
          maxLength={40}
          data-testid="check-query"
        />
        <Button type="submit" variant="primary" size="md" full loading={pending} data-testid="check-submit">
          {copy.submit}
        </Button>
      </form>

      <div aria-live="polite" className="mt-md">
        {state && !state.ok && (
          <p role="alert" className="text-[length:var(--nf-text-body-sm)] text-[var(--nf-state-error)]" data-testid="check-failed">
            {copy.failed}
          </p>
        )}
        {state?.ok && <Answer outcome={state.data} copy={copy} locale={locale} />}
      </div>
    </div>
  );
}

function Answer({ outcome, copy, locale }: { outcome: CheckOutcome; copy: CheckCopy; locale: Locale }) {
  if (outcome.state === "unreadable") {
    return <p className="text-[length:var(--nf-text-body-sm)] text-[var(--nf-state-warning)]">{copy.unreadable}</p>;
  }
  if (outcome.state === "limited") {
    return <p className="text-[length:var(--nf-text-body-sm)] text-[var(--nf-state-warning)]">{copy.limited.replace("{when}", outcome.retryIn)}</p>;
  }
  const result = outcome.result;
  if (!result.found) {
    return (
      <div className="rounded-[var(--nf-container-radius)] border border-[var(--nf-border-subtle)] p-md" data-testid="check-no">
        <p className="flex items-center gap-xs font-semibold text-[var(--nf-content-primary)]">
          <UiIcon name="info" size={20} className="shrink-0" />
          {result.kind === "code" ? copy.noCodeTitle : copy.noTitle}
        </p>
        <p className="mt-xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          {result.kind === "code" ? copy.noCodeBody : copy.noBody}
        </p>
      </div>
    );
  }
  /* THE CLAIMS RULE. A code proves only that the code exists: a scammer can
     quote a real agent's code. So a code answer names the owner of the code
     and says to message them on Vallo; no badge unless an identity document
     was actually checked, and no sentence at all when it was not. */
  const checked = result.identityCheckedAt
    ? copy.yesIdentity.replace(
        "{date}",
        formatDate(new Date(result.identityCheckedAt), locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" }),
      )
    : null;
  const title =
    result.kind === "code"
      ? (result.displayName ? copy.codeTitle.replace("{name}", result.displayName) : copy.codeTitleNoName).replace("{code}", result.code ?? "")
      : result.displayName
        ? copy.yesTitle.replace("{name}", result.displayName)
        : copy.yesTitleNoName;
  return (
    <div className="rounded-[var(--nf-container-radius)] border border-[var(--nf-border-subtle)] p-md" data-testid="check-yes">
      <p className="flex items-center gap-xs font-semibold text-[var(--nf-content-primary)]">
        {checked && <UiIcon name="verified-badge" size={20} className="shrink-0 text-[var(--nf-state-success)]" />}
        {title}
      </p>
      {result.role && (
        <p className="mt-xs text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">{copy.yesRole[result.role]}</p>
      )}
      {result.kind === "code" && result.hint && (
        <p className="mt-xs text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">{copy.codeHint.replace("{hint}", result.hint)}</p>
      )}
      {checked && <p className="mt-xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">{checked}</p>}
      <p className="mt-xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
        {result.kind === "code" ? copy.codeCheck : copy.yesWhy}
      </p>
      {result.handle && (
        <ButtonLink href={`/u/${encodeURIComponent(result.handle)}`} variant="secondary" size="md" full className="mt-sm">
          {copy.yesTalk}
        </ButtonLink>
      )}
    </div>
  );
}
