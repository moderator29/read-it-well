"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { TYPE } from "@/components/app/Screen";
import { VERIFICATION_ORDER } from "@/lib/trust/verification";
import "@/app/css/catalogue.css";

/**
 * THE VERIFIED PILL, WITH SOMEWHERE TO GO.
 *
 * The badge was a static pill. The whole product rests on it: it is the one
 * claim that separates Vallo from a classifieds board, and a buyer met it on
 * the listing with no way to ask what it means. An unexplained tick is exactly
 * what every untrustworthy listings site in this market also prints, so a tick
 * nobody can interrogate is not a trust signal at all, it is decoration that
 * looks like one.
 *
 * The ladder is already modelled as data in `lib/trust/verification.ts` and was
 * published only on /standards, in the docs and in the agent's own console, in
 * other words everywhere except the screen where somebody is deciding whether
 * to send a stranger money. `VERIFICATION_ORDER` is read here verbatim: four
 * rungs, in the order a real agent passes them, each with what passing it
 * actually proves. Nothing is invented and no per-agent data is needed, so this
 * works today on every listing that carries the badge.
 *
 * WHAT IT DOES NOT MEAN IS PART OF THE SHEET, not a footnote. A trust claim
 * that only lists what it covers is how somebody reads a checked identity as a
 * checked building. The three lines at the foot are the boundaries of the
 * claim, and they are the same boundaries /standards and the terms state:
 * Vallo checks the person, not the brickwork, and holds nobody's money.
 *
 * When per-agent rungs are readable on this surface, the rung list gains a
 * passed mark per row and the sheet says which tier THIS agent holds. The
 * shape below is built for that: the rows are already the ladder, in order.
 */
export function VerifiedAgentBadge({ label }: { label: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-testid="verified-agent-badge"
        className="nf-agent-card__pill nf-tap"
      >
        <UiIcon name="verified" size={12} />
        {label}
        {/* The affordance, at the size the pill can carry: without it the
            control reads as a label and nobody taps it. */}
        <UiIcon name="info" size={12} className="opacity-70" />
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="What Verified means"
        detents={[0.72, 0.92]}
        closeLabel="Close"
      >
        <p className={`${TYPE.body} px-card`}>
          Vallo checks the person behind a listing before it goes live. These are
          the four checks, in the order an agent passes them.
        </p>

        <ol className="mt-block grid gap-md px-card">
          {VERIFICATION_ORDER.map((rung) => (
            <li key={rung.kind} className="flex gap-md">
              <span className="nf-verify-step" aria-hidden="true">
                {rung.step}
              </span>
              <span className="min-w-0 leading-tight">
                <span className={`block ${TYPE.rowTitle}`}>{rung.label}</span>
                <span className={`mt-3xs block ${TYPE.rowMeta}`}>{rung.meaning}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-block px-card pb-card">
          <h3 className="nf-group-label">What it does not mean</h3>
          <ul className={`grid gap-row ${TYPE.rowMeta}`}>
            <li className="flex gap-inline-tight">
              <UiIcon name="info" size={16} className="mt-3xs shrink-0" />
              <span>
                Nobody from Vallo has inspected this property. Book an inspection
                and see it before you pay anything.
              </span>
            </li>
            <li className="flex gap-inline-tight">
              <UiIcon name="info" size={16} className="mt-3xs shrink-0" />
              <span>
                It says nothing about the price, the condition or whether the
                place is still available.
              </span>
            </li>
            <li className="flex gap-inline-tight">
              <UiIcon name="info" size={16} className="mt-3xs shrink-0" />
              <span>
                Vallo does not hold your money for you. Keep every message and
                every payment inside the app so there is a record.
              </span>
            </li>
          </ul>
        </div>
      </Sheet>
    </>
  );
}
