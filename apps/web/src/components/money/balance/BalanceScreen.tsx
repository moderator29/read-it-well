"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { formatMoneyDate } from "@/lib/money/dates";
import type { MovementView } from "@/lib/money/member-wallet";
import type { BalanceFigures, MovementKind } from "@/lib/money/funds";
import { isOpenMovement } from "@/lib/money/funds";
import {
  ACTION_LABEL,
  ACTIVITY_EMPTY,
  FIGURE_HINT,
  FIGURE_LABEL,
  HELD_BY,
  HELD_BY_HREF,
  HELD_BY_LINK,
  NOT_CONNECTED_FIGURE,
  NOT_CONNECTED_LINE,
  STALE_NOTE,
  UNREACHABLE_FIGURE,
  UNREACHABLE_LINE,
  WALLET_RECORDS,
  WALLET_RECORDS_LABEL,
  WAITING_COPY,
  WAITING_STEPS,
  confirmedAgo,
  movementTitle,
} from "@/lib/money/balance-copy";
import { MoneyFigure, MomentDot } from "../kit";
import { StepPath } from "../StepPath";
import { MoneyExplainer } from "../MoneyExplainer";
import { MovementStatusWord } from "./balance-ui";
import { WalletCard } from "./WalletCard";
import { WithdrawFlow, Watching } from "./WithdrawFlow";
import { AddMoneyFlow } from "./AddMoneyFlow";
import { SendFlow } from "./SendFlow";
import "@/app/css/money-wallet.css";

/**
 * THE WALLET SCREEN (founder sections 36 to 43; Part B phase 6; D76; D78;
 * the founder on 7 October: "Call it WALLET... design it to be fully clean").
 *
 * One layout for every state, so the member sees the real wallet before the
 * key is connected: the wallet card on the platform's blue container (the
 * figure, or calm words in its place, never a zero), Add money on the card,
 * what is still moving, where the money is, the activity, and the wallet's
 * own two-action bar (Withdraw, Transfer) at the foot.
 *
 * Not connected: no figure, every action visibly present and disabled, and
 * one short line on the card saying why. Connected: every figure arrives
 * from the server and this component adds nothing up; when the partner could
 * not be reached the last confirmed figures are shown, labelled, and the
 * actions wait. References: GOVERNING-plasma-rewards-home and -spendable
 * (the wallet home), ledger-home-net-balance-mascot (the movement list),
 * PREMIUM-STANDARD 4 (the figure, its kobo smaller).
 */
const KIND_ICON: Record<MovementKind, UiIconName> = {
  deposit: "arrow-down",
  transfer_in: "arrow-down",
  withdrawal: "bank",
  transfer_out: "arrow-up",
  other: "coins",
};

const ACTION_ICON: Record<"add" | "withdraw" | "send", UiIconName> = { add: "plus", withdraw: "bank", send: "arrow-up" };

function sign(kind: MovementKind): "+" | "-" | undefined {
  if (kind === "deposit" || kind === "transfer_in") return "+";
  if (kind === "withdrawal" || kind === "transfer_out") return "-";
  return undefined;
}

function counterpartyLine(m: MovementView): string {
  const cp = m.counterparty;
  if (m.kind === "withdrawal") return [cp.bank, cp.last4 ? `•••• ${cp.last4}` : ""].filter(Boolean).join(" ");
  if (m.kind === "transfer_out") return cp.name ? `To ${cp.name}` : "To a Vallo member";
  if (m.kind === "transfer_in") return "From a Vallo member";
  return "From your bank or card";
}

/** The explainer's sample withdrawal: first step done, second in progress, the rest ahead. */
const EXPLAINER_STEP_STATE = ["done", "current", "upcoming"] as const;

export function BalanceScreen({
  figures,
  movements,
  live,
  locale,
  now,
  connected = true,
  reason,
}: {
  figures: BalanceFigures | null;
  movements: MovementView[];
  live: boolean;
  locale: Locale;
  /** The server's clock at render, so "confirmed n minutes ago" is the same on both sides. */
  now: number;
  /**
   * False while the provider's key is not connected (the route's not-live
   * read): the whole wallet is drawn, with no figure, every action disabled
   * and one short line saying why. True is every existing path.
   */
  connected?: boolean;
  /** Why it is not connected, for the record (`data-reason`), never shown. */
  reason?: string;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<"add" | "withdraw" | "send" | null>(null);
  const [opened, setOpened] = useState<MovementView | null>(null);
  /* D76's hide toggle: for this visit only, never stored. */
  const [hidden, setHidden] = useState(false);
  const refresh = () => router.refresh();
  const canMove = connected && live && figures !== null;
  const watching = connected ? movements.find((m) => isOpenMovement(m.status)) : undefined;
  const availableAt = figures?.available.confirmedAt ?? null;
  const unreachable = connected && figures === null;

  return (
    <div
      className="nf-balance nf-mw mt-inline"
      data-testid={connected ? "balance-screen" : "balance-not-live"}
      data-live={live ? "true" : "false"}
      data-reason={reason}
    >
      <WalletCard
        caption={FIGURE_LABEL.available}
        figure={
          figures ? (
            hidden ? (
              <span className="nf-mfig nf-mfig--hero nf-mfig--hidden" data-testid="balance-available">
                <span className="nf-mfig__cur">₦</span>
                <span aria-hidden="true">••••••</span>
                <span className="sr-only">Amount hidden</span>
              </span>
            ) : (
              <MoneyFigure minor={figures.available.minor} locale={locale} currency={figures.currency} size="hero" testId="balance-available" />
            )
          ) : undefined
        }
        empty={connected ? UNREACHABLE_FIGURE : NOT_CONNECTED_FIGURE}
        line={!connected ? NOT_CONNECTED_LINE : unreachable ? UNREACHABLE_LINE : confirmedAgo(availableAt, now)}
        tone={!connected ? "neutral" : live && figures ? "done" : "waiting"}
        corner={
          figures ? (
            <button
              type="button"
              className="nf-mw-card__eye"
              aria-pressed={hidden}
              aria-label={hidden ? "Show amount" : "Hide amount"}
              onClick={() => setHidden((h) => !h)}
              data-testid="balance-hide"
            >
              <UiIcon name={hidden ? "eye-off" : "eye"} size={20} />
            </button>
          ) : null
        }
        action={
          unreachable ? (
            <Button variant="secondary" size="md" onClick={refresh} data-testid="balance-retry">
              Try again
            </Button>
          ) : (
            /* D76: Add money stays on the card. */
            <Button variant="secondary" size="md" leadingIcon="plus" disabled={!canMove} onClick={() => setSheet("add")} data-testid="balance-action-add">
              {ACTION_LABEL.add}
            </Button>
          )
        }
      />

      {!live && figures ? (
        <p className="nf-balance__note nf-body-sm" role="status">
          <UiIcon name="info" />
          <span>{STALE_NOTE}</span>
        </p>
      ) : null}

      {watching ? (
        <section aria-label="Still moving" className="nf-moving-wrap">
          <h2 className="nf-overline nf-moving-wrap__label">Still moving</h2>
          <button type="button" className="nf-moving" onClick={() => setOpened(watching)} data-testid="balance-moving">
            <MomentDot tone="waiting" live size="md" />
            <span className="nf-moving__text">
              <span className="nf-moving__title">{movementTitle(watching.kind)}</span>
              <span className="nf-moving__sub">{counterpartyLine(watching)}</span>
            </span>
            <span className="nf-moving__end">
              <MoneyFigure minor={watching.amountMinor} locale={locale} size="row" kobo="auto" />
              <MovementStatusWord movement={watching} />
            </span>
            <UiIcon name="chevron-right" size={16} className="nf-moving__chev" />
          </button>
        </section>
      ) : null}

      {figures ? (
        <ListGroup label="Where your money is">
          {(["protected", "pending", "processing"] as const).map((k) => {
            const at = figures[k].confirmedAt;
            /* The time is said once, on the card; a row repeats it only when it differs. */
            const own = at && at !== availableAt ? ` ${confirmedAgo(at, now)}.` : "";
            return (
              <ListRow
                key={k}
                leading={
                  <IconPlate size="sm" tone={k === "protected" ? "info" : "neutral"}>
                    <UiIcon name={k === "protected" ? "shield-lock" : k === "pending" ? "hourglass" : "clock"} size={ICON_PLATE_GLYPH.sm} />
                  </IconPlate>
                }
                title={FIGURE_LABEL[k]}
                sub={`${FIGURE_HINT[k]}${own}`}
                value={<MoneyFigure minor={figures[k].minor} locale={locale} currency={figures.currency} size="row" kobo="auto" />}
              />
            );
          })}
        </ListGroup>
      ) : null}

      {movements.length === 0 ? (
        <section className="nf-list-section" aria-labelledby="nf-mw-activity">
          <div className="nf-list-section__head">
            <h3 id="nf-mw-activity" className="nf-section-label">
              Activity
            </h3>
          </div>
          <div className="nf-panel nf-mw-empty" data-testid="balance-activity-empty">
            <IconPlate size="md" tone="brand">
              <UiIcon name="receipt" size={ICON_PLATE_GLYPH.md} />
            </IconPlate>
            <p className="nf-mw-empty__title">{ACTIVITY_EMPTY.title}</p>
            <p className="nf-mw-empty__body">{ACTIVITY_EMPTY.body}</p>
          </div>
        </section>
      ) : (
        <ListGroup label="Activity">
          {movements.map((m) => (
            <ListRow
              key={m.id}
              leading={
                <IconPlate size="sm" shape="round">
                  <UiIcon name={KIND_ICON[m.kind]} size={ICON_PLATE_GLYPH.sm} />
                </IconPlate>
              }
              title={movementTitle(m.kind)}
              sub={formatMoneyDate(m.createdAt, locale, { withTime: true }) ?? counterpartyLine(m)}
              value={<MoneyFigure minor={m.amountMinor} locale={locale} size="row" kobo="auto" sign={sign(m.kind)} className={sign(m.kind) === "+" ? "nf-mfig--in" : undefined} />}
              status={<MovementStatusWord movement={m} />}
              chevron
              onClick={() => setOpened(m)}
            />
          ))}
        </ListGroup>
      )}

      {/* The wallet is where all money lives: the records, one tap away. */}
      <ListGroup label={WALLET_RECORDS_LABEL} data-testid="balance-records">
        {WALLET_RECORDS.map((r) => (
          <ListRow
            key={r.href}
            href={r.href}
            leading={
              <IconPlate size="sm">
                <UiIcon name={r.icon} size={ICON_PLATE_GLYPH.sm} />
              </IconPlate>
            }
            title={r.title}
            chevron
          />
        ))}
      </ListGroup>

      {/* ADR 0003's one line, only where money is actually held. */}
      {connected && figures ? (
        <p className="nf-mw__held nf-caption" data-testid="balance-held-by">
          <UiIcon name="shield-lock" size={16} />
          <span>
            {HELD_BY}{" "}
            <Link href={HELD_BY_HREF} className="underline">
              {HELD_BY_LINK}
            </Link>
          </span>
        </p>
      ) : null}

      {/* D76: the wallet's own bar holds exactly two actions, Withdraw and
          Transfer, at the foot of the screen above the safe area. The app's
          main dock is untouched. */}
      <div className="nf-mw-bar" role="group" aria-label="Move money">
        <Button variant="primary" size="lg" full leadingIcon={ACTION_ICON.withdraw} disabled={!canMove} onClick={() => setSheet("withdraw")} data-testid="balance-action-withdraw">
          {ACTION_LABEL.withdraw}
        </Button>
        <Button variant="secondary" size="lg" full leadingIcon={ACTION_ICON.send} disabled={!canMove} onClick={() => setSheet("send")} data-testid="balance-action-send">
          Transfer
        </Button>
      </div>

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

      {canMove && figures ? <BalanceExplainer figures={figures} locale={locale} /> : null}

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

/**
 * The first visit to a live balance (PREMIUM-STANDARD reference 9). Three
 * panels, each a fragment of the real screen drawn from the member's own
 * Available figure: the balance, a withdrawal at half of it with the quick
 * chips, and the path a movement takes. The words are the screen's own.
 */
function BalanceExplainer({ figures, locale }: { figures: BalanceFigures; locale: Locale }) {
  const availableMinor = figures.available.minor;
  const currency = figures.currency;
  const half = Math.floor(availableMinor / 2 / 100) * 100;
  return (
    <MoneyExplainer
      storageKey="nf-explainer-balance-v1"
      name="Wallet"
      testId="balance-explainer"
      panels={[
        {
          key: "held",
          title: "Held in your name",
          body: "Our escrow partner holds it in an account in your name, never Vallo. Vallo keeps the record of every movement.",
          screenTone: "platinum",
          screen: (
            <>
              <span className="nf-frag__label">{FIGURE_LABEL.available}</span>
              <MoneyFigure minor={availableMinor} locale={locale} currency={currency} size="lg" kobo="auto" />
            </>
          ),
          fragment: (
            <div className="nf-frag nf-frag--card">
              <span className="nf-frag__row">
                <span>Where your money is</span>
                <UiIcon name="chevron-right" size={16} />
              </span>
              <span className="nf-frag__split">
                <span>
                  <span className="nf-frag__label">{FIGURE_LABEL.protected}</span>
                  <MoneyFigure minor={figures.protected.minor} locale={locale} currency={currency} size="md" kobo="auto" />
                </span>
                <span>
                  <span className="nf-frag__label">{FIGURE_LABEL.pending}</span>
                  <MoneyFigure minor={figures.pending.minor} locale={locale} currency={currency} size="md" kobo="auto" />
                </span>
              </span>
            </div>
          ),
        },
        {
          key: "withdraw",
          title: "Withdraw when you want",
          screen: <span className="nf-frag__label">{ACTION_LABEL.withdraw}</span>,
          body: "Choose an amount, see every fee before you confirm, and slide to send it to your bank.",
          fragment: (
            <div className="nf-frag">
              <span className="nf-frag__pill">
                {FIGURE_LABEL.available} <MoneyFigure minor={availableMinor} locale={locale} currency={currency} size="row" kobo="auto" />
              </span>
              <MoneyFigure minor={half} locale={locale} currency={currency} size="lg" kobo="auto" />
              <span className="nf-frag__line">To a bank account in your name</span>
              <span className="nf-frag__chips" aria-hidden="true">
                <span className="nf-frag__chip">25%</span>
                <span className="nf-frag__chip" data-on="true">
                  50%
                </span>
                <span className="nf-frag__chip">Max</span>
              </span>
            </div>
          ),
        },
        {
          key: "steps",
          title: "Every step, shown",
          body: WAITING_COPY.withdrawal.body,
          fragment: (
            <StepPath
              compact
              label="Where a withdrawal is"
              steps={WAITING_STEPS.withdrawal.map((step, i) => ({ key: step, title: step, state: EXPLAINER_STEP_STATE[Math.min(i, 2)] ?? "upcoming" }))}
            />
          ),
        },
      ]}
    />
  );
}
