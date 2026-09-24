"use client";

import type { Dictionary } from "@vallo/i18n";
import { Button } from "@/components/ui/Button";
import { FEEDBACK_KINDS, FEEDBACK_MOTION, feedback, type FeedbackKind } from "@/lib/ui/feedback";

/**
 * The feedback grammar, pressable. V-30.
 *
 * Five buttons, one per kind, each firing exactly what `lib/ui/feedback.ts`
 * fires for it: the system pattern in the native shell, a distinct pulse on
 * Android web, nothing on iOS web or a desktop. Under each, the motion token
 * the kind moves with, so a builder reading this page sees that what is felt
 * and what is seen were chosen together.
 */
export function FeedbackSpecimens({ copy }: { copy: Dictionary["platform"]["feedback"] }) {
  const label: Record<FeedbackKind, { name: string; note: string }> = {
    select: { name: copy.select, note: copy.selectNote },
    confirm: { name: copy.confirm, note: copy.confirmNote },
    success: { name: copy.success, note: copy.successNote },
    warning: { name: copy.warning, note: copy.warningNote },
    error: { name: copy.error, note: copy.errorNote },
  };
  return (
    <ul className="nf-panel nf-panel--card block space-y-row p-card-sm" data-testid="feedback-specimens">
      {FEEDBACK_KINDS.map((kind) => (
        <li key={kind} className="flex items-center justify-between gap-inline">
          <span className="min-w-0">
            <span className="nf-body block font-semibold text-content">{label[kind].name}</span>
            <span className="nf-caption block text-muted">{label[kind].note}</span>
            <code className="nf-caption block text-muted">{FEEDBACK_MOTION[kind].ease}</code>
          </span>
          <Button size="sm" variant="secondary" onClick={() => feedback(kind)}>
            {label[kind].name}
          </Button>
        </li>
      ))}
    </ul>
  );
}
