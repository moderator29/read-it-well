"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { BatchTray, type BatchAction } from "@/components/ui/BatchTray";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import "./admin-material.css";

/**
 * THE QUEUE'S MULTI-SELECT, WITH THE BATCH TRAY (COMPONENT_LIBRARY, "Batch
 * gesture tray": admin queues).
 *
 * The unified queue already decides rows in bulk: every row carries a checkbox
 * that belongs to the form `#queue-bulk`, and that form's server action
 * (`bulkAct`) takes a verb, an optional reason and an optional operator, runs
 * the desks' own per-item actions and writes one audit row per item under one
 * batch id. NOTHING ABOUT THAT CHANGED. This adds the control a thumb wants:
 * the moment one row is ticked a tray rises with the count and the verbs, and
 * choosing one fills the form's verb and submits it. The form stays in the page
 * and works without scripts; the tray is the way in once scripts have loaded.
 *
 * WHAT IT WILL NOT DO. It never decides whether a verb is allowed (the server
 * does, per item, and says how many it skipped). It disables a verb that cannot
 * run on this selection only where the form itself says so: "Send back" needs a
 * reason picked in the form, "Hand to" needs an operator. A verb that closes
 * work as not a person, or sends a lister's submission back, is
 * consequential and cannot be taken by one tap: it opens a confirmation sheet
 * first. Money is never in this queue, and the tray is never used for it
 * (a payout or a refund is one `DragToConfirm`, one at a time).
 *
 * THE AUDITOR'S THREE RULES (A3, S1). Approve is consequential for a lister's
 * submission, so it confirms like Send back. A verb that cannot run yet says
 * why in a line (and takes the operator to the field), never a silent
 * disabled button. And once the form is submitting, the whole tray is inert
 * until the server answers, so a second tap cannot run the batch twice; the
 * selection is re-read whenever the page restores or the form resets, so the
 * count never describes boxes that are no longer ticked.
 */
export type SelectionVerb = {
  id: string;
  label: string;
  icon: UiIconName;
  /** Needs a value in the form's own select before it can run. */
  needs?: "reason" | "to";
  /** Opens a confirmation sheet first. */
  confirm?: boolean;
};

export type SelectionWords = {
  /** The toolbar's accessible name. */
  label: string;
  /** "{count} selected" */
  count: string;
  clear: string;
  selectAll: string;
  selectNone: string;
  confirmTitle: string;
  /** "Apply {verb} to {count} rows?" */
  confirmBody: string;
  confirmApply: string;
  notNow: string;
  /** "{verb} needs a reason, chosen in the bulk form." */
  needsReason: string;
  /** "{verb} needs a person to hand to, chosen in the bulk form." */
  needsTo: string;
  /** The control that opens the bulk form at the missing field. */
  needsOpen: string;
};

/** The event the in-form status reports on, so the tray can go inert while it submits. */
const PENDING_EVENT = "queue-bulk-pending";

/**
 * Rendered INSIDE the bulk form, where `useFormStatus` can see the submission.
 * It is the form's submit button (loading while the server works) and it tells
 * the tray, which lives outside the form, to go inert for the same time.
 */
export function BulkSubmit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  useEffect(() => {
    document.dispatchEvent(new CustomEvent(PENDING_EVENT, { detail: pending }));
  }, [pending]);
  return (
    <Button variant="secondary" size="sm" type="submit" morph loading={pending}>
      {children}
    </Button>
  );
}

const FORM = "queue-bulk";

function boxes(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][form="${FORM}"][name="item"]`)];
}

export function QueueSelection({ verbs, words }: { verbs: readonly SelectionVerb[]; words: SelectionWords }) {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [have, setHave] = useState({ reason: false, to: false });
  const [asking, setAsking] = useState<SelectionVerb | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const read = useCallback(() => {
    const all = boxes();
    setTotal(all.length);
    setCount(all.filter((box) => box.checked).length);
    const form = document.getElementById(FORM) as HTMLFormElement | null;
    const value = (name: string) => (form?.elements.namedItem(name) as HTMLSelectElement | null)?.value ?? "";
    setHave({ reason: value("reason") !== "", to: value("to") !== "" });
  }, []);

  /* The boxes and selects belong to the server-drawn form, so this listens at
     the document and re-reads, rather than owning any of their state. */
  useEffect(() => {
    /* The first read waits one tick so the server-drawn boxes are in the page. */
    const first = window.setTimeout(read, 0);
    /* A reset fires before the values change, and a restored page (back, or
       the browser's cache) may bring boxes back ticked or cleared: read again
       once the new state is in place. */
    let later = 0;
    const soon = () => {
      window.clearTimeout(later);
      later = window.setTimeout(read, 0);
    };
    const pending = (event: Event) => setSubmitting((event as CustomEvent<boolean>).detail === true);
    document.addEventListener("change", read);
    document.addEventListener("reset", soon);
    window.addEventListener("pageshow", soon);
    document.addEventListener(PENDING_EVENT, pending);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(later);
      document.removeEventListener("change", read);
      document.removeEventListener("reset", soon);
      window.removeEventListener("pageshow", soon);
      document.removeEventListener(PENDING_EVENT, pending);
    };
  }, [read]);

  const clear = () => {
    for (const box of boxes()) box.checked = false;
    read();
  };
  const toggleAll = () => {
    const all = boxes();
    const next = !all.every((box) => box.checked);
    for (const box of all) box.checked = next;
    read();
  };
  const missing = verbs.filter((verb) => (verb.needs === "reason" && !have.reason) || (verb.needs === "to" && !have.to));
  /* Open the form and put the person on the field the verb is waiting for. */
  const openField = (verb: SelectionVerb) => {
    const form = document.getElementById(FORM) as HTMLFormElement | null;
    const details = form?.closest("details");
    if (details) details.open = true;
    (form?.elements.namedItem(verb.needs === "to" ? "to" : "reason") as HTMLElement | null)?.focus();
  };
  const run = (verb: SelectionVerb) => {
    const form = document.getElementById(FORM) as HTMLFormElement | null;
    const select = form?.elements.namedItem("verb") as HTMLSelectElement | null;
    if (!form || !select) return;
    select.value = verb.id;
    form.requestSubmit();
  };

  const actions: BatchAction[] = verbs.map((verb) => ({
    id: verb.id,
    label: verb.label,
    icon: verb.icon,
    disabled: submitting || (verb.needs === "reason" && !have.reason) || (verb.needs === "to" && !have.to),
    onSelect: () => (verb.confirm ? setAsking(verb) : run(verb)),
  }));

  return (
    <>
      {total > 0 && (
        <p className="nf-admin-selectall">
          <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={toggleAll}>
            {count === total ? words.selectNone : words.selectAll}
          </Button>
        </p>
      )}
      {count > 0 &&
        missing.map((verb) => (
          <p key={verb.id} className="nf-admin-bulk__hint" role="status" data-testid="bulk-needs">
            {(verb.needs === "to" ? words.needsTo : words.needsReason).replace("{verb}", verb.label)}{" "}
            <Button type="button" variant="quiet" size="sm" onClick={() => openField(verb)}>
              {words.needsOpen}
            </Button>
          </p>
        ))}
      <BatchTray
        count={count}
        countLabel={words.count.replace("{count}", String(count))}
        label={words.label}
        clearLabel={words.clear}
        onClear={clear}
        actions={actions}
      />
      <Sheet
        open={asking !== null}
        onOpenChange={(next) => {
          if (!next) setAsking(null);
        }}
        title={words.confirmTitle}
        footer={
          <div className="grid gap-sm">
            <Button
              variant="primary"
              full
              onClick={() => {
                const verb = asking;
                setAsking(null);
                if (verb) run(verb);
              }}
            >
              {words.confirmApply}
            </Button>
            <Button variant="secondary" full onClick={() => setAsking(null)}>
              {words.notNow}
            </Button>
          </div>
        }
      >
        <p className="text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          {asking ? words.confirmBody.replace("{verb}", asking.label).replace("{count}", String(count)) : ""}
        </p>
      </Sheet>
    </>
  );
}
