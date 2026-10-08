import type { Locale } from "@vallo/i18n/core";
import type { BalanceRead } from "@/lib/money/member-wallet";
import { State } from "@/components/ui/State";
import { ACTION_LABEL, BALANCE_TITLE } from "@/lib/money/balance-copy";
import type { WalletFilter } from "@/lib/money/wallet-view";
import { BalanceScreen } from "./BalanceScreen";
import { BalanceOnboarding } from "./BalanceOnboarding";
import { TransactionsScreen } from "./TransactionsScreen";
import { WalletSettingsScreen } from "./WalletSettingsScreen";
import { AddMoneyScreen } from "./AddMoneyScreen";
import { SendScreen } from "./SendScreen";
import { WithdrawScreen } from "./WithdrawScreen";
import { WALLET_LINKS, WalletHeader, WalletTabs, type WalletLinks } from "./WalletChrome";
import "@/app/css/money-layer.css";
import "@/app/css/money-wallet.css";

/**
 * Every signed-in state of every Wallet screen (D81), as one component the
 * routes draw with the real read and the preview harness draws with sample
 * reads. The routes keep the signed-out door themselves (`withNext`).
 *
 * NOT CONNECTED IS THE WALLET ITSELF (the founder, 7 October: "Build the
 * front end and the wallet design, let me see it, even though the key is not
 * connected"). Each screen is drawn whole with no figure in the figure's
 * place; the move-money screens take an amount and say at their last step,
 * plainly, that it is not available yet. Nothing is ever shown as sent.
 */
export type WalletScreen = "overview" | "transactions" | "settings" | "add" | "send" | "withdraw";

const SCREEN_TITLE: Record<WalletScreen, string> = {
  overview: BALANCE_TITLE,
  transactions: BALANCE_TITLE,
  settings: BALANCE_TITLE,
  add: ACTION_LABEL.add,
  send: ACTION_LABEL.send,
  withdraw: ACTION_LABEL.withdraw,
};

export function BalanceView({
  read,
  locale,
  screen = "overview",
  links = WALLET_LINKS,
  filter,
}: {
  read: Exclude<BalanceRead, { state: "signed-out" }>;
  locale: Locale;
  screen?: WalletScreen;
  links?: WalletLinks;
  /** The Transactions screen's first filter (from `?filter=`). */
  filter?: WalletFilter;
}) {
  if (screen === "settings") return <WalletSettingsScreen links={links} connected={read.state === "ready"} />;

  if (read.state === "not-live" || read.state === "ready") {
    const connected = read.state === "ready";
    const figures = connected ? read.figures : null;
    const movements = connected ? read.movements : [];
    const totals = connected ? (read.totals ?? null) : null;
    const availableMinor = figures ? figures.available.minor : null;
    switch (screen) {
      case "transactions":
        return (
          <TransactionsScreen
            figures={figures}
            movements={movements}
            totals={totals}
            more={connected ? Boolean(read.more) : false}
            connected={connected}
            locale={locale}
            initialFilter={filter}
            links={links}
          />
        );
      case "add":
        return <AddMoneyScreen availableMinor={availableMinor} connected={connected} locale={locale} links={links} />;
      case "send":
        return <SendScreen availableMinor={availableMinor} connected={connected} locale={locale} links={links} />;
      case "withdraw":
        return <WithdrawScreen availableMinor={availableMinor} connected={connected} locale={locale} links={links} />;
      default:
        return connected ? (
          <BalanceScreen figures={figures} movements={movements} totals={totals} live={read.live} locale={locale} now={Date.parse(read.readAt)} links={links} />
        ) : (
          <BalanceScreen figures={null} movements={[]} live={false} connected={false} reason={read.reason} locale={locale} now={0} links={links} />
        );
    }
  }

  /* Opening the account, or a read that failed: the Wallet's own frame around the one thing to do. */
  const tabs = screen === "overview" || screen === "transactions";
  return (
    <div className="nf-balance nf-mw" data-screen={screen}>
      <WalletHeader title={SCREEN_TITLE[screen]} back={tabs ? links.home : links.overview} settings={tabs ? links.settings : null} />
      {tabs ? <WalletTabs active={screen === "transactions" ? "transactions" : "overview"} links={links} /> : null}
      {read.state === "onboarding" ? (
        <BalanceOnboarding state={read.onboarding} gaps={read.gaps} />
      ) : (
        <State kind="error" title="Your figures could not be read" body="Nothing has moved. Try again in a moment." primary={{ href: links.overview, label: "Try again" }} />
      )}
    </div>
  );
}
