import Link from "next/link";
import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ACTION_LABEL, WALLET_BACK, WALLET_SETTINGS_TITLE, WALLET_TABS } from "@/lib/money/balance-copy";

/**
 * THE WALLET'S OWN CHROME (D81; the founder's governing reference, the
 * right-hand phone). The global header and dock step aside on /wallet
 * (`isFocusedRoute` in MobileTabBar.tsx), so this is the only bar: back,
 * the title, the settings gear; under it Overview and Transactions; and at
 * the foot of the Overview the two capsules, Withdraw and Send.
 *
 * Every address comes in through `WalletLinks`, so the preview harness can
 * draw the same screens wired to its own sample states.
 */
export type WalletLinks = {
  home: string;
  overview: string;
  transactions: string;
  settings: string;
  add: string;
  send: string;
  withdraw: string;
};

export const WALLET_LINKS: WalletLinks = {
  home: "/home",
  overview: "/wallet",
  transactions: "/wallet/transactions",
  settings: "/wallet/settings",
  add: "/wallet/add",
  send: "/wallet/send",
  withdraw: "/wallet/withdraw",
};

export function WalletHeader({ title, back, settings, end }: { title: string; back: string; settings?: string | null; end?: ReactNode }) {
  return (
    <header className="nf-mw-head" data-testid="wallet-header">
      <Link href={back} className="nf-mw-head__btn nf-mw-head__btn--back" aria-label={WALLET_BACK} data-testid="wallet-back">
        <UiIcon name="arrow-left" size={22} />
      </Link>
      <h1 className="nf-mw-head__title">{title}</h1>
      {end}
      {settings ? (
        <Link href={settings} className="nf-mw-head__btn nf-mw-head__btn--gear" aria-label={WALLET_SETTINGS_TITLE} data-testid="wallet-settings">
          <UiIcon name="settings-gear" size={20} />
        </Link>
      ) : null}
    </header>
  );
}

/** Overview | Transactions: two screens, so two links, the current one marked. */
export function WalletTabs({ active, links }: { active: "overview" | "transactions"; links: WalletLinks }) {
  return (
    <nav className="nf-mw-tabs" aria-label="Views" data-testid="wallet-tabs">
      {(["overview", "transactions"] as const).map((tab) => (
        <Link
          key={tab}
          href={tab === "overview" ? links.overview : links.transactions}
          className="nf-mw-tabs__tab"
          aria-current={active === tab ? "page" : undefined}
          data-testid={`wallet-tab-${tab}`}
        >
          {WALLET_TABS[tab]}
        </Link>
      ))}
    </nav>
  );
}

/**
 * THE TWO CAPSULES (D81; the brief, section 3E). Exactly two, side by side,
 * at the very bottom of the Overview: Withdraw (the action blue) and Send
 * (the spark fill). Nowhere else on the Wallet draws either. They open their
 * screens in every state; a screen that cannot finish yet says so at its
 * last step, never here by hiding the way in.
 */
export function WalletCapsules({ links }: { links: WalletLinks }) {
  return (
    <div className="nf-mw-capsules" role="group" aria-label="Move money" data-testid="wallet-capsules">
      <Link href={links.withdraw} className="nf-mw-cap nf-mw-cap--blue" data-testid="balance-action-withdraw">
        <UiIcon name="arrow-up" size={20} />
        <span>{ACTION_LABEL.withdraw}</span>
      </Link>
      <Link href={links.send} className="nf-mw-cap nf-mw-cap--spark" data-testid="balance-action-send">
        <UiIcon name="send" size={20} />
        <span>{ACTION_LABEL.send}</span>
      </Link>
    </div>
  );
}
