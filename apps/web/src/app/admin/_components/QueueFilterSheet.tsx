"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import "./admin-material.css";
import { Button } from "@/components/ui/Button";
import { queueHref } from "./queue-href";

/**
 * A DESK'S FILTERS, IN A BOTTOM SHEET ON A PHONE.
 *
 * The inline date disclosure and the row of status chips are right on a desk
 * with a mouse and wrong on a phone: the dates open under the search field and
 * push the queue down the screen, and a long chip row scrolls sideways under a
 * thumb. On a phone the filter control opens a Sheet instead (north star 15.2:
 * the one sheet pattern), with the dates and the statuses in it and the
 * Apply and Clear actions at its foot, above the home indicator, which is
 * where a right thumb already is.
 *
 * IT FILTERS NOTHING ITSELF. The sheet holds a plain GET form pointing at the
 * desk's own address, so applying a filter is the same navigation the inline
 * form made: the narrowed queue is a URL, the back button walks it backwards,
 * and the desk stays a server component that reads its own parameters. The
 * status chips are the same links the inline row draws, one per real value of
 * the enum the desk passed, never an invented status. Choosing one closes the
 * sheet as the page changes.
 *
 * The inline controls stay in the page and are hidden on a phone (admin
 * material sheet), so with scripts off nothing is lost: the form is still
 * there, only drawn the old way.
 */
export function QueueFilterSheet({
  base,
  keep,
  q,
  status,
  from,
  to,
  statuses,
  statusLinks,
  dateable,
  narrowedCount,
  words,
}: {
  /** The desk's path, which the form posts to. */
  base: string;
  /** Fields a lane of the unified queue keeps (`?tab=`). */
  keep: [string, string][];
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  /** `tone` is the chip class the desk already draws for the value (`chipTone`). */
  statuses: { value: string; label: string; href: string; on: boolean; tone: string }[];
  /** The href of the "All" chip (no status). */
  statusLinks: { all: string; allOn: boolean };
  dateable: boolean;
  /** How many filters are on, for the control's badge and its name. */
  narrowedCount: number;
  words: {
    open: string;
    title: string;
    from: string;
    to: string;
    status: string;
    all: string;
    /** The close control's accessible name (not the sheet's title). */
    close: string;
    apply: string;
    reset: string;
    on: string;
    off: string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement | null>(null);
  const id = useId();
  return (
    <>
      {/* The wrapper owns where the control sits and when it is shown (below
          768 only), so the Button keeps its own geometry untouched. */}
      <span className="nf-admin-filter-open">
        <Button
          type="button"
          variant="icon"
          round
          aria-haspopup="dialog"
          aria-label={`${words.open}, ${narrowedCount > 0 ? words.on.replace("{count}", String(narrowedCount)) : words.off}`}
          onClick={() => setOpen(true)}
        >
          <UiIcon name="sliders" size={20} />
        </Button>
        {narrowedCount > 0 && <span className="nf-admin-filter-open__dot nf-numeric" aria-hidden="true">{narrowedCount}</span>}
      </span>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={words.title}
        detents={[0.7]}
        closeLabel={words.close}
        reset={{
          label: words.reset,
          onClick: () => {
            setOpen(false);
            /* Clearing the filters keeps the lane the person is in: the desk's own
               `?tab=` is rebuilt through `queueHref`, never dropped for a bare path. */
            router.push(queueHref(keep.length > 0 ? `${base}?${new URLSearchParams(keep).toString()}` : base, {}, {}));
          },
          disabled: narrowedCount === 0,
        }}
        apply={{ label: words.apply, onClick: () => form.current?.requestSubmit() }}
      >
        <form ref={form} method="get" action={base} className="nf-admin-filter-sheet" onSubmit={() => setOpen(false)}>
          {keep.map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {dateable && (
            <div className="nf-admin-filter-sheet__dates">
              <label htmlFor={`${id}-from`} className="nf-label">
                {words.from}
                <input id={`${id}-from`} type="date" name="from" defaultValue={from ?? ""} className="nf-field mt-inline-tight w-full" />
              </label>
              <label htmlFor={`${id}-to`} className="nf-label">
                {words.to}
                <input id={`${id}-to`} type="date" name="to" defaultValue={to ?? ""} className="nf-field mt-inline-tight w-full" />
              </label>
            </div>
          )}
        </form>
        {statuses.length > 0 && (
          <nav aria-label={words.status} className="nf-admin-filter-sheet__status">
            <p className="nf-overline">{words.status}</p>
            <ul>
              <li>
                <Link
                  href={statusLinks.all}
                  aria-current={statusLinks.allOn ? "true" : undefined}
                  className={`nf-admin-chip nf-admin-chip--all${statusLinks.allOn ? " nf-admin-chip--on" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  {words.all}
                </Link>
              </li>
              {statuses.map((option) => (
                <li key={option.value}>
                  <Link
                    href={option.href}
                    aria-current={option.on ? "true" : undefined}
                    className={`nf-admin-chip ${option.tone}${option.on ? " nf-admin-chip--on" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    {option.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </Sheet>
    </>
  );
}
