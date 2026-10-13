import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import type { TieredObjectName } from "@/design-system/icons/object-assets";
import { HELD_BY, HELD_BY_HREF, HELD_BY_LINK, WALLET_SETTINGS_TITLE, WALLET_TOOL_GROUPS } from "@/lib/money/balance-copy";
import { WALLET_LINKS, WalletHeader, type WalletLinks } from "./WalletChrome";
import "@/app/css/money-wallet.css";

/**
 * THE WALLET'S TOOLS AND SETTINGS (D81; the brief, section 5), behind the
 * header's gear. Four groups of tool cards, each card a real screen that
 * exists today: records, payment methods, money management, and security
 * and preferences. Cards and bank accounts are one screen on Vallo, so they
 * are one card. Nothing here is a capability Vallo does not have.
 */
type ToolHref = (typeof WALLET_TOOL_GROUPS)[number]["tools"][number]["href"];

const TOOL_ART: Record<ToolHref, TieredObjectName> = {
  "/receipts": "doc-search",
  "/wallet/transactions": "clipboard-list",
  "/settings/payments": "cards-stack-orange",
  "/payments": "banknote-fold",
  "/payouts": "banknotes-stack",
  "/refunds": "sync-arrows",
  "/settings/passcode": "padlock",
  "/settings/notifications": "bell",
};

export function WalletSettingsScreen({ links = WALLET_LINKS, connected = true }: { links?: WalletLinks; connected?: boolean }) {
  return (
    <div className="nf-balance nf-mw" data-screen="settings" data-testid="wallet-settings-screen">
      <WalletHeader title={WALLET_SETTINGS_TITLE} back={links.overview} />
      {WALLET_TOOL_GROUPS.map((group) => (
        <section key={group.label} className="nf-mw-section" aria-labelledby={`nf-mw-tools-${group.label}`}>
          <div className="nf-mw-section__head">
            <h2 id={`nf-mw-tools-${group.label}`} className="nf-mw-section__title">
              {group.label}
            </h2>
          </div>
          <div className="nf-mw-toolgrid">
            {group.tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href === "/wallet/transactions" ? links.transactions : tool.href}
                className="nf-mw-panel nf-mw-toolcard"
                data-testid="wallet-tool"
              >
                <span className="nf-mw-tool-art" data-host-plate="" aria-hidden="true">
                  <BrandIcon name={TOOL_ART[tool.href]} size={30} />
                </span>
                <span className="nf-mw-toolcard__title">{tool.title}</span>
                <span className="nf-mw-toolcard__sub">{tool.sub}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {connected ? (
        <p className="nf-caption px-2xs text-[var(--nf-content-muted)]">
          {HELD_BY}{" "}
          <Link href={HELD_BY_HREF} className="underline">
            {HELD_BY_LINK}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
