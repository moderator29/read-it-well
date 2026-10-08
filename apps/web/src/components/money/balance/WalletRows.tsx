"use client";

import { useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { Sheet } from "@/components/ui/Sheet";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { formatMoneyDate } from "@/lib/money/dates";
import type { MovementView } from "@/lib/money/member-wallet";
import { movementStatusLabel, movementTitle, movementTone } from "@/lib/money/balance-copy";
import { counterpartyLine, didNotMove, movementDirection, movementTileTone } from "@/lib/money/wallet-view";
import type { MovementKind } from "@/lib/money/funds";
import { MoneyFigure } from "../kit";
import { Watching, waitKind } from "./balance-ui";

/**
 * THE TRANSACTION ROWS (D81; the reference's rows): a coloured square with a
 * solid glyph (green for money in, the spark for a send, blue for a
 * withdrawal), the title and its "From:" or "To:" line, and on the right the
 * amount (green in, orange out), the date and time, and the status in a
 * small pill. Every word comes from the record; a row that did not move money
 * has its figure struck through. Tapping a row opens its details: the
 * waiting room while it is open, the receipt once it is completed.
 */
const KIND_GLYPH: Record<MovementKind, UiIconName> = {
  deposit: "plus",
  transfer_in: "arrow-down",
  transfer_out: "send",
  withdrawal: "bank",
  other: "banknote",
};

export function MovementTile({ kind }: { kind: MovementKind }) {
  return (
    <span className="nf-mw-tile" data-tone={movementTileTone(kind)} aria-hidden="true">
      <UiIcon name={KIND_GLYPH[kind]} size={20} />
    </span>
  );
}

export function MovementPill({ movement }: { movement: Pick<MovementView, "kind" | "status"> }) {
  return (
    <span className="nf-mw-pill" data-tone={movementTone(movement.status)}>
      {movementStatusLabel(movement.kind, movement.status)}
    </span>
  );
}

function MovementRow({ m, locale, onOpen }: { m: MovementView; locale: Locale; onOpen(): void }) {
  const way = movementDirection(m.kind);
  const moved = !didNotMove(m.status);
  return (
    <button type="button" className="nf-mw-row" onClick={onOpen} data-testid="wallet-row" data-kind={m.kind}>
      <MovementTile kind={m.kind} />
      <span className="nf-mw-row__title">{movementTitle(m.kind)}</span>
      <span className="nf-mw-row__amount" data-way={way ?? undefined} data-moved={moved ? undefined : "false"}>
        <MoneyFigure minor={m.amountMinor} locale={locale} size="row" kobo="auto" sign={way === "in" ? "+" : way === "out" ? "-" : undefined} />
      </span>
      <span className="nf-mw-row__sub">{counterpartyLine(m.kind, m.counterparty)}</span>
      <span className="nf-mw-row__date">{formatMoneyDate(m.createdAt, locale, { withTime: true })}</span>
      <span className="nf-mw-row__status">
        <MovementPill movement={m} />
      </span>
    </button>
  );
}

/** A list of movements on the platform's container, with the details sheet they open. */
export function MovementList({
  movements,
  locale,
  onSettled,
  testId,
}: {
  movements: MovementView[];
  locale: Locale;
  onSettled(): void;
  testId?: string;
}) {
  const [opened, setOpened] = useState<MovementView | null>(null);
  return (
    <>
      <ul className="nf-mw-panel nf-mw-list" data-testid={testId}>
        {movements.map((m) => (
          <li key={m.id}>
            <MovementRow m={m} locale={locale} onOpen={() => setOpened(m)} />
          </li>
        ))}
      </ul>
      <Sheet open={opened !== null} onOpenChange={(o) => !o && setOpened(null)} title={opened ? movementTitle(opened.kind) : "Movement"} testId="balance-movement">
        {opened ? (
          <div className="grid gap-block pb-block">
            <Watching key={opened.id} kind={waitKind(opened.kind)} movement={opened} locale={locale} onDone={() => setOpened(null)} onSettled={onSettled} />
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

/** Nothing to list yet: one solid object and one line. */
export function MovementsEmpty({ title, body, testId }: { title: string; body?: string; testId?: string }) {
  return (
    <div className="nf-mw-panel nf-mw-empty" data-testid={testId}>
      <span className="nf-mw-tool-art" data-host-plate="" aria-hidden="true">
        <BrandIcon name="clipboard-list" size={30} />
      </span>
      <p className="nf-mw-empty__title">{title}</p>
      {body ? <p className="nf-mw-empty__body">{body}</p> : null}
    </div>
  );
}
