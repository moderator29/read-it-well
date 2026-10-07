"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { HeroFigure } from "@/components/ui/HeroFigure";
import { Money } from "@/components/ui/Money";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate } from "@/components/ui/IconPlate";
import { Sheet } from "@/components/ui/Sheet";
import { State } from "@/components/ui/State";
import { Button } from "@/components/ui/Button";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { formatMoneyDate } from "@/lib/money/dates";
import type { MovementView } from "@/lib/money/member-wallet";
import type { BalanceFigures, MovementKind } from "@/lib/money/funds";
import { isOpenMovement } from "@/lib/money/funds";
import {
  ACTION_LABEL,
  FIGURE_HINT,
  FIGURE_LABEL,
  HELD_BY,
  HELD_BY_HREF,
  HELD_BY_LINK,
  STALE_NOTE,
  confirmedAgo,
  movementTitle,
} from "@/lib/money/balance-copy";
import { FinancePlate, MovementStatusPill, type FinanceGlyph } from "./balance-ui";
import { WithdrawFlow, Watching } from "./WithdrawFlow";
import { AddMoneyFlow } from "./AddMoneyFlow";
import { SendFlow } from "./SendFlow";

/**
 * THE BALANCE SCREEN (founder sections 36 to 43; Part B phase 6).
 *
 * Founder reference 6AF37222 gives the order: the figure, the actions under
 * it, then what moved. Section 37 adds what that reference lacks: Available
 * and Protected are never confused, so Available is the one hero figure and
 * Protected, Pending and Processing sit under it as rows, each saying what it
 * is and when the partner last confirmed it. Every figure arrives from the
 * server; this component adds nothing up.
 *
 * Money moves only on live figures: when the partner could not be reached
 * the last confirmed figures are shown, labelled, and the actions wait.
 */
const KIND_ICON: Record<MovementKind, UiIconName> = {
  deposit: "arrow-down",
  transfer_in: "arrow-down",
  withdrawal: "bank",
  transfer_out: "arrow-up",
  other: "coins",
};

function sign(kind: MovementKind): "+" | "-" | "" {
  if (kind === "deposit" || kind === "transfer_in") return "+";
  if (kind === "withdrawal" || kind === "transfer_out") return "-";
  return "";
}

function counterpartyLine(m: MovementView): string {
  const cp = m.counterparty;
  if (m.kind === "withdrawal") return [cp.bank, cp.last4 ? `•••• ${cp.last4}` : ""].filter(Boolean).join(" ");
  if (m.kind === "transfer_out") return cp.name ? `To ${cp.name}` : "To a Vallo member";
  if (m.kind === "transfer_in") return "From a Vallo member";
  return "From your bank or card";
}

export function BalanceScreen({
  figures,
  movements,
  live,
  locale,
  now,
}: {
  figures: BalanceFigures | null;
  movements: MovementView[];
  live: boolean;
  locale: Locale;
  /** The server's clock at render, so "confirmed n minutes ago" is the same on both sides. */
  now: number;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<"add" | "withdraw" | "send" | null>(null);
  const [opened, setOpened] = useState<MovementView | null>(null);
  const refresh = () => router.refresh();
  const canMove = live && figures !== null;
  const watching = movements.find((m) => isOpenMovement(m.status));

  const actions: { key: "add" | "withdraw" | "send"; glyph: FinanceGlyph }[] = [
    { key: "add", glyph: "add-money" },
    { key: "withdraw", glyph: "withdraw" },
    { key: "send", glyph: "send-money" },
  ];

  return (
    <div className="mt-inline space-y-block" data-testid="balance-screen" data-live={live ? "true" : "false"}>
      {figures ? (
        <HeroFigure
          id="nf-balance-available"
          caption={FIGURE_LABEL.available}
          sub={`${FIGURE_HINT.available} ${confirmedAgo(figures.available.confirmedAt, now)}.`}
          ems={11}
        >
          <Money minor={figures.available.minor} locale={locale} currency={figures.currency} mode="full" />
        </HeroFigure>
      ) : (
        <State
          kind="error"
          title="We could not reach our partner"
          body="Your balance could not be read just now, so no figure is shown rather than a wrong one. Nothing has moved. Try again shortly."
          primary={{ href: "/wallet", label: "Try again" }}
        />
      )}

      {!live && figures ? (
        <p className="nf-balance__note nf-body-sm" role="status">
          <UiIcon name="info" />
          <span>{STALE_NOTE}</span>
        </p>
      ) : null}

      <div className="nf-balance__actions" role="group" aria-label="Move money">
        {actions.map((a) => (
          <button key={a.key} type="button" className="nf-balance__action nf-body-sm" disabled={!canMove} onClick={() => setSheet(a.key)} data-testid={`balance-action-${a.key}`}>
            <FinancePlate glyph={a.glyph} />
            {ACTION_LABEL[a.key]}
          </button>
        ))}
      </div>

      {watching ? (
        <ListGroup label="Still moving">
          <ListRow
            leading={<FinancePlate glyph="pending" />}
            title={movementTitle(watching.kind)}
            sub={counterpartyLine(watching)}
            value={<Money minor={watching.amountMinor} locale={locale} mode="full" />}
            status={<MovementStatusPill movement={watching} />}
            chevron
            onClick={() => setOpened(watching)}
          />
        </ListGroup>
      ) : null}

      {figures ? (
        <ListGroup label="Where your money is">
          {(["protected", "pending", "processing"] as const).map((k) => (
            <ListRow
              key={k}
              leading={
                <IconPlate size="sm" tone={k === "protected" ? "info" : "neutral"}>
                  <UiIcon name={k === "protected" ? "shield-lock" : k === "pending" ? "hourglass" : "clock"} />
                </IconPlate>
              }
              title={FIGURE_LABEL[k]}
              sub={`${FIGURE_HINT[k]} ${confirmedAgo(figures[k].confirmedAt, now)}.`}
              value={<Money minor={figures[k].minor} locale={locale} currency={figures.currency} mode="full" />}
            />
          ))}
        </ListGroup>
      ) : null}

      <p className="nf-balance__held nf-body-sm" data-testid="balance-held-by">
        <FinancePlate glyph="secure" className="nf-balance__plate" />
        <span>
          {HELD_BY}{" "}
          <Link href={HELD_BY_HREF} className="underline">
            {HELD_BY_LINK}
          </Link>
        </span>
      </p>

      {movements.length === 0 ? (
        <State
          kind="empty"
          title="Nothing has moved yet"
          body="When you add, withdraw or send money it shows here, with where it is at every step."
          action={
            canMove ? (
              <Button variant="primary" size="lg" onClick={() => setSheet("add")}>
                {ACTION_LABEL.add}
              </Button>
            ) : null
          }
        />
      ) : (
        <ListGroup label="Activity">
          {movements.map((m) => (
            <ListRow
              key={m.id}
              leading={
                <IconPlate size="sm" shape="round">
                  <UiIcon name={KIND_ICON[m.kind]} />
                </IconPlate>
              }
              title={movementTitle(m.kind)}
              sub={`${counterpartyLine(m)} · ${formatMoneyDate(m.createdAt, locale, { withTime: true }) ?? ""}`}
              value={
                <span className="tabular-nums">
                  {sign(m.kind)}
                  <Money minor={m.amountMinor} locale={locale} mode="full" />
                </span>
              }
              status={<MovementStatusPill movement={m} />}
              chevron
              onClick={() => setOpened(m)}
            />
          ))}
        </ListGroup>
      )}

      {figures ? (
        <>
          <AddMoneyFlow open={sheet === "add"} onOpenChange={(o) => setSheet(o ? "add" : null)} locale={locale} onMoved={refresh} />
          <WithdrawFlow
            open={sheet === "withdraw"}
            onOpenChange={(o) => setSheet(o ? "withdraw" : null)}
            locale={locale}
            availableMinor={figures.available.minor}
            onMoved={refresh}
          />
          <SendFlow open={sheet === "send"} onOpenChange={(o) => setSheet(o ? "send" : null)} locale={locale} availableMinor={figures.available.minor} onMoved={refresh} />
        </>
      ) : null}

      <Sheet open={opened !== null} onOpenChange={(o) => !o && setOpened(null)} title={opened ? movementTitle(opened.kind) : "Movement"} testId="balance-movement">
        {opened ? (
          <div className="grid gap-block pb-block">
            <Watching
              key={opened.id}
              kind={opened.kind === "withdrawal" ? "withdrawal" : opened.kind === "deposit" || opened.kind === "transfer_in" ? "deposit" : "send"}
              movement={opened}
              locale={locale}
              onDone={() => setOpened(null)}
              onSettled={refresh}
            />
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
