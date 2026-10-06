"use client";

import { useCallback, useEffect, useState } from "react";
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
};

const FORM = "queue-bulk";

function boxes(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][form="${FORM}"][name="item"]`)];
}

export function QueueSelection({ verbs, words }: { verbs: readonly SelectionVerb[]; words: SelectionWords }) {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [have, setHave] = useState({ reason: false, to: false });
  const [asking, setAsking] = useState<SelectionVerb | null>(null);

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
    document.addEventListener("change", read);
    return () => {
      window.clearTimeout(first);
      document.removeEventListener("change", read);
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
    disabled: (verb.needs === "reason" && !have.reason) || (verb.needs === "to" && !have.to),
    onSelect: () => (verb.confirm ? setAsking(verb) : run(verb)),
  }));

  return (
    <>
      {total > 0 && (
        <p className="nf-admin-selectall">
          <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
            {count === total ? words.selectNone : words.selectAll}
          </Button>
        </p>
      )}
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
