"use client";

import { useState } from "react";
import Link from "next/link";
import type { Locale } from "@naijafinds/i18n";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import { ICON, Row, RowList, TYPE } from "@/components/app/Screen";
import type { BalanceBreakdown, EscrowLine, EscrowPurpose, EscrowState } from "@/lib/wallet/types";

/**
 * WHAT THE ONE NUMBER IS MADE OF, behind one tap.
 *
 * The wallet states a single figure and it is correct. It stopped being
 * SUFFICIENT the moment escrow became real, because an escrow hold is a debit:
 * pay a ₦1,200,000 deposit into escrow and the balance drops by ₦1,200,000
 * with nothing on the screen saying where it went. The money is not gone. The
 * wallet just had no word for held.
 *
 * ONE HEADLINE, A BREAKDOWN BEHIND IT. Not three figures on the front of the
 * card. Three numbers of equal weight is how somebody ends up unsure which one
 * is theirs, and the answer to "how much have I got" is one number: what they
 * can spend. Everything else is context, and context belongs one tap away.
 *
 * WHAT IS DELIBERATELY NOT HERE: a total. Nothing sums available, held and
 * incoming, because money you might get back plus money you might receive is a
 * figure that is true of no moment in time.
 *
 * The two escrow sections list the individual holds and NAME THE PROPERTY on
 * each, which is the point of the sheet as much as the totals are: "₦1,200,000
 * held" answers nothing on its own, and "₦1,200,000 held, deposit, 3 bedroom
 * flat at Admiralty Way" answers the whole question. The title is real or
 * absent - a hold whose listing has come down says the purpose and no more.
 */

/** How the eight states read to somebody who is not reading the schema. */
const STATE_LABEL: Record<EscrowState, string> = {
  INITIATED: "Agreed",
  FUNDED: "Funded",
  HELD: "Held",
  RELEASE_REQUESTED: "Release requested",
  RELEASED: "Released",
  REFUNDED: "Refunded",
  DISPUTED: "Disputed",
  RESOLVED: "Resolved",
};

/**
 * The tone each state carries.
 *
 * `DISPUTED` is the only one painted as trouble, and it should be: it is the
 * state where the money has stopped and a person has to do something.
 */
const STATE_TONE: Record<EscrowState, StatusTone> = {
  INITIATED: "neutral",
  FUNDED: "info",
  HELD: "info",
  RELEASE_REQUESTED: "warning",
  RELEASED: "success",
  REFUNDED: "neutral",
  DISPUTED: "danger",
  RESOLVED: "success",
};

const PURPOSE_LABEL: Record<EscrowPurpose, string> = {
  rent_deposit: "Rent deposit",
  first_rent: "First rent",
  purchase_deposit: "Purchase deposit",
  purchase_balance: "Completion payment",
};

export function BalanceBreakdownSheet({
  breakdown,
  locale,
  /** Masked with the rest of the card when the balance is hidden. */
  hidden = false,
}: {
  breakdown: BalanceBreakdown;
  locale: Locale;
  hidden?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const anyHeld = breakdown.heldOutMinor > 0 || breakdown.heldInMinor > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="nf-chip min-h-11"
        data-testid="wallet-breakdown-open"
      >
        <UiIcon name="sliders" size="xs" />
        {anyHeld ? BREAKDOWN_WITH_HELD : BREAKDOWN_PLAIN}
      </button>

      <Sheet open={open} onOpenChange={setOpen} title={SHEET_TITLE} detents={[0.55, 0.92]}>
        {breakdown.readFailed ? (
          /* The balance screen's own rule, applied to the part of it this
             sheet owns: an unreadable figure is never drawn as a zero. */
          <p className={`px-3xs py-group ${TYPE.body}`}>{READ_FAILED}</p>
        ) : (
          <>
            <p className={`px-3xs pb-row ${TYPE.body}`}>{SHEET_SUB}</p>

            {/* THE THREE PARTS. One surface, hairlines between, no card per
                figure. `inset={false}` because these rows lead with a label
                rather than a glyph, so an indented rule would look like a
                mistake instead of an alignment. */}
            <RowList inset={false}>
              <Part
                label={AVAILABLE}
                note={AVAILABLE_NOTE}
                minor={breakdown.availableMinor}
                locale={locale}
                hidden={hidden}
                emphasis
              />
              <Part
                label={HELD_OUT}
                note={HELD_OUT_NOTE}
                minor={breakdown.heldOutMinor}
                locale={locale}
                hidden={hidden}
              />
              <Part
                label={HELD_IN}
                note={HELD_IN_NOTE}
                minor={breakdown.heldInMinor}
                locale={locale}
                hidden={hidden}
              />
            </RowList>

            <Holds
              title={YOUR_HOLDS}
              lines={breakdown.outgoing}
              locale={locale}
              hidden={hidden}
            />
            <Holds
              title={HOLDS_FOR_YOU}
              lines={breakdown.incoming}
              locale={locale}
              hidden={hidden}
            />

            {!anyHeld && <p className={`mt-block px-3xs ${TYPE.rowMeta}`}>{NOTHING_HELD}</p>}
          </>
        )}
      </Sheet>
    </>
  );
}

/** One of the three parts: a label, a line saying what it means, a figure. */
function Part({
  label,
  note,
  minor,
  locale,
  hidden,
  emphasis,
}: {
  label: string;
  note: string;
  minor: number;
  locale: Locale;
  hidden: boolean;
  /** The available figure, which is the one that answers the question. */
  emphasis?: boolean;
}) {
  return (
    <Row className="items-start justify-between gap-md">
      <span className="min-w-0">
        <span className={`block ${TYPE.rowTitle}`}>{label}</span>
        <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>{note}</span>
      </span>
      <span
        className={`nf-numeric shrink-0 font-semibold ${
          emphasis ? "nf-h4" : "nf-body text-[var(--nf-content-secondary)]"
        }`}
      >
        {hidden ? "••••" : <Amount minorUnits={minor} locale={locale} showFraction />}
      </span>
    </Row>
  );
}

/** The individual holds in one direction, each naming its property. */
function Holds({
  title,
  lines,
  locale,
  hidden,
}: {
  title: string;
  lines: EscrowLine[];
  locale: Locale;
  hidden: boolean;
}) {
  if (lines.length === 0) return null;

  return (
    <section className="mt-heading">
      {/* The label sits OUTSIDE the surface, which is the composition the whole
          product is moving to: the surface holds content and never a heading. */}
      <h3 className="nf-group-label">{title}</h3>
      <RowList boxed>
        {lines.map((line) => {
          const body = (
            <>
              <UiIcon
                name="shield-stop"
                size={ICON.row}
                className="shrink-0 text-[var(--nf-content-muted)]"
              />
              <span className="min-w-0 flex-1">
                <span className={`block ${TYPE.rowTitle}`}>
                  {line.listingTitle ?? PURPOSE_LABEL[line.purpose]}
                </span>
                <span className={`mt-inline-tight block ${TYPE.rowMeta}`}>
                  {line.listingTitle ? PURPOSE_LABEL[line.purpose] : UNNAMED_PROPERTY}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="nf-numeric block nf-body-sm font-semibold">
                  {hidden ? "••••" : <Amount minorUnits={line.amountMinor} locale={locale} showFraction />}
                </span>
                <StatusPill tone={STATE_TONE[line.state]} className="mt-inline-tight">
                  {STATE_LABEL[line.state]}
                </StatusPill>
              </span>
            </>
          );

          /* The property is a tap when it still exists. A hold against a
             listing that has come down is not a dead link, it is a plain row. */
          return line.listingId ? (
            <Row key={line.id} className="p-0">
              <Link href={`/listing/${line.listingId}`} className="nf-row nf-row--tap w-full px-3xs">
                {body}
              </Link>
            </Row>
          ) : (
            <Row key={line.id}>{body}</Row>
          );
        })}
      </RowList>
    </section>
  );
}

/* --------------------------------------------------------------- the copy */
const SHEET_TITLE = "Where your money is";
const SHEET_SUB =
  "Your wallet holds one balance. Escrow moves money out of it and holds it until both sides are done, so this is the whole picture.";
const BREAKDOWN_PLAIN = "Breakdown";
const BREAKDOWN_WITH_HELD = "Money in escrow";
const AVAILABLE = "Available";
const AVAILABLE_NOTE = "Yours to spend, send or withdraw right now.";
const HELD_OUT = "Held for you";
const HELD_OUT_NOTE = "You have paid this into escrow. It comes back if the deal does not happen.";
const HELD_IN = "Coming to you";
const HELD_IN_NOTE = "Somebody has put this into escrow with you as the payee. Not yours until it is released.";
const YOUR_HOLDS = "What you have in escrow";
const HOLDS_FOR_YOU = "What is being held for you";
const UNNAMED_PROPERTY = "The property this was against is no longer listed";
const NOTHING_HELD = "Nothing is in escrow right now, so your available balance is everything you have.";
const READ_FAILED =
  "We could not check what is in escrow just now, so we are not showing a figure rather than showing you one we cannot stand behind. Your available balance above is unaffected.";
