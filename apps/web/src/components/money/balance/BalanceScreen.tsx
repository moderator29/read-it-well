"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@vallo/i18n/core";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { Sheet } from "@/components/ui/Sheet";
import { State } from "@/components/ui/State";
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
  WAITING_COPY,
  WAITING_STEPS,
  confirmedAgo,
  movementTitle,
} from "@/lib/money/balance-copy";
import { MoneyCard, MoneyFigure, MomentDot } from "../kit";
import { StepPath } from "../StepPath";
import { MoneyExplainer } from "../MoneyExplainer";
import { FinancePlate, MovementStatusWord } from "./balance-ui";
import { WithdrawFlow, Watching } from "./WithdrawFlow";
import { AddMoneyFlow } from "./AddMoneyFlow";
import { SendFlow } from "./SendFlow";

/**
 * THE BALANCE SCREEN (founder sections 36 to 43; Part B phase 6;
 * PREMIUM-STANDARD references 4, 7 and 9; handoff A.9).
 *
 * Founder reference 6AF37222 gives the order: the figure, the actions under
 * it, then what moved. The figure sits on the money card (A.9: a glass object
 * with the shape and weight of a bank card), its kobo set smaller (reference
 * 4). Section 37 adds what that reference lacks: Available and Protected are
 * never confused, so Available is the one figure on the card and Protected,
 * Pending and Processing sit under it as rows, each saying what it is. Every
 * figure arrives from the server; this component adds nothing up.
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
  /* D76's hide toggle: for this visit only, never stored. */
  const [hidden, setHidden] = useState(false);
  const refresh = () => router.refresh();
  const canMove = live && figures !== null;
  const watching = movements.find((m) => isOpenMovement(m.status));
  const availableAt = figures?.available.confirmedAt ?? null;

  return (
    <div className="nf-balance mt-inline space-y-block" data-testid="balance-screen" data-live={live ? "true" : "false"}>
      {figures ? (
        <MoneyCard
          id="nf-balance-available"
          testId="balance-card"
          caption={FIGURE_LABEL.available}
          corner={
            <button
              type="button"
              className="nf-mcard__eye"
              aria-pressed={hidden}
              aria-label={hidden ? "Show balance" : "Hide balance"}
              onClick={() => setHidden((h) => !h)}
              data-testid="balance-hide"
            >
              <UiIcon name={hidden ? "eye-off" : "eye"} size={20} />
            </button>
          }
          figure={
            hidden ? (
              <span className="nf-mfig nf-mfig--hero nf-mfig--hidden" data-testid="balance-available">
                <span className="nf-mfig__cur">₦</span>
                <span aria-hidden="true">••••••</span>
                <span className="sr-only">Balance hidden</span>
              </span>
            ) : (
              <MoneyFigure minor={figures.available.minor} locale={locale} currency={figures.currency} size="hero" testId="balance-available" />
            )
          }
          sub={FIGURE_HINT.available}
          foot={
            <>
              <span className="nf-mcard__state">
                <MomentDot tone={live ? "done" : "waiting"} size="sm" />
                {confirmedAgo(availableAt, now)}
              </span>
              {/* D76: Add money stays on the balance card. */}
              <button type="button" className="nf-mcard__add" disabled={!canMove} onClick={() => setSheet("add")} data-testid="balance-action-add">
                <UiIcon name="plus" size={16} />
                {ACTION_LABEL.add}
              </button>
            </>
          }
        />
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
        <State kind="empty" icon="wallet-ring" title="Nothing has moved yet" body="When you add, withdraw or send money it shows here, with where it is at every step." />
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
              sub={`${counterpartyLine(m)} · ${formatMoneyDate(m.createdAt, locale, { withTime: true }) ?? ""}`}
              value={<MoneyFigure minor={m.amountMinor} locale={locale} size="row" kobo="auto" sign={sign(m.kind)} className={sign(m.kind) === "+" ? "nf-mfig--in" : undefined} />}
              status={<MovementStatusWord movement={m} />}
              chevron
              onClick={() => setOpened(m)}
            />
          ))}
        </ListGroup>
      )}

      {/* D76: the balance's own bar holds exactly two actions, Withdraw and
          Transfer, pinned to the foot of the screen above the safe area. The
          app's main dock is untouched. */}
      <div className="nf-wallet-bar" role="group" aria-label="Move money">
        <button type="button" className="nf-wallet-bar__btn" data-tone="primary" disabled={!canMove} onClick={() => setSheet("withdraw")} data-testid="balance-action-withdraw">
          <UiIcon name={ACTION_ICON.withdraw} size={20} />
          {ACTION_LABEL.withdraw}
        </button>
        <button type="button" className="nf-wallet-bar__btn" disabled={!canMove} onClick={() => setSheet("send")} data-testid="balance-action-send">
          <UiIcon name={ACTION_ICON.send} size={20} />
          Transfer
        </button>
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
      name="Your balance"
      testId="balance-explainer"
      panels={[
        {
          key: "held",
          title: "Your balance, in your name",
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
              steps={WAITING_STEPS.withdrawal.map((step, i) => ({ key: step, title: step, state: EXPLAINER_STEP_STATE[Math.min(i, 2)] }))}
            />
          ),
        },
      ]}
    />
  );
}
