import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ActionResult } from "@/lib/actions/envelope";

/**
 * A refusal, drawn as a refusal.
 *
 * Assertive, rose ink on the error surface, a cross, and a verdict line
 * above the message so the first thing read is what happened rather than
 * why. Never cyan: `--nf-state-warning` is this product's pending colour, and
 * a failed movement painted in it is the platform telling somebody their
 * money is still going through when it is not.
 */
export function ErrorNotice<T>({
  state,
  title = "That did not go through",
}: {
  state: ActionResult<T>;
  title?: string;
}) {
  if (state.ok || state.error.length === 0) return null;
  return (
    <div
      role="alert"
      className="nf-body-sm mt-row flex items-start gap-inline rounded-[var(--nf-container-radius)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] bg-[var(--nf-state-error-surface)] p-row leading-relaxed text-[var(--nf-content-secondary)]"
    >
      <UiIcon name="close" size="xs" className="mt-3xs shrink-0 text-[var(--nf-state-error)]" />
      <span className="min-w-0">
        <span className="block font-semibold text-[var(--nf-state-error)]">{title}</span>
        <span className="mt-3xs block">{state.error}</span>
      </span>
    </div>
  );
}

export function fieldError<T>(state: ActionResult<T>, field: string): string | undefined {
  return state.ok ? undefined : state.fieldErrors?.[field];
}
