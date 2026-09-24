import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { MoneyGlyph } from "./MoneyGlyph";

/**
 * The four tiles inside the balance card, shared by the wallet home and the
 * send page (6AF37222 and 77A54EA3 draw the same row on both).
 *
 * WHAT THE FOUR TILES ARE, AND WHAT THEY ARE NOT.
 * The renders draw Send, Receive, Top Up and Swap. Swap is refused (no second
 * currency is held and crypto is dark by ruling). The render's "Top Up" is
 * refused as a label; the funding path itself is real end to end (a Paystack
 * deposit completed in the production ledger on 9 August 2026), so it ships
 * under the product's own name for it, "Add money". Withdraw was the obvious
 * fourth and is NOT drawn: the only production withdrawal failed with
 * Paystack's "You cannot initiate third party payouts as a starter
 * business", so a bank payout does not work end to end today (an open
 * question for the founder). The fourth slot is the statement, which
 * is real. Send is the lit tile on both pages, as both renders light it.
 *
 * Add money opens the funding sheet where the page has one (`onAddMoney`),
 * and goes to the wallet with that sheet open where it does not.
 */
export function WalletTiles({
  copy,
  current,
  onAddMoney,
}: {
  copy: Dictionary["wallet"]["home"];
  current: "wallet" | "send";
  onAddMoney?: () => void;
}) {
  return (
    <nav aria-label={copy.actionsLabel} className="nf-wallet-tiles">
      <Link
        href="/wallet/send"
        className="nf-wallet-tile nf-wallet-tile--primary"
        aria-current={current === "send" ? "page" : undefined}
      >
        <MoneyGlyph name="send-arrow" size={24} className="nf-wallet-tile__glyph" />
        {copy.send}
      </Link>
      <Link href="/wallet/receive" className="nf-wallet-tile">
        <MoneyGlyph name="receive-arrow" size={24} className="nf-wallet-tile__glyph" />
        {copy.receive}
      </Link>
      {onAddMoney ? (
        <button type="button" className="nf-wallet-tile" aria-haspopup="dialog" onClick={onAddMoney}>
          <MoneyGlyph name="plus-square" size={24} className="nf-wallet-tile__glyph" />
          {copy.addMoneyTile}
        </button>
      ) : (
        <Link href="/wallet?action=fund" className="nf-wallet-tile">
          <MoneyGlyph name="plus-square" size={24} className="nf-wallet-tile__glyph" />
          {copy.addMoneyTile}
        </Link>
      )}
      <Link href="/wallet/transactions" className="nf-wallet-tile">
        <MoneyGlyph name="statement" size={24} className="nf-wallet-tile__glyph" />
        {copy.historyTile}
      </Link>
    </nav>
  );
}
