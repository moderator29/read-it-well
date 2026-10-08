import { notFound } from "next/navigation";
import { previewHarnessIsOpen } from "@/lib/preview-harness";
import { BalanceView, type WalletScreen } from "@/components/money/balance/BalanceView";
import { AddMoneyScreen } from "@/components/money/balance/AddMoneyScreen";
import { SendScreen } from "@/components/money/balance/SendScreen";
import { WithdrawScreen } from "@/components/money/balance/WithdrawScreen";
import type { WalletLinks } from "@/components/money/balance/WalletChrome";
import { FIGURES } from "../../p5/fixtures";
import LoadingWallet from "@/app/(app)/wallet/loading";
import {
  SAMPLE_ACCOUNT,
  SAMPLE_RECIPIENT,
  SAMPLE_SEND_QUOTE,
  SAMPLE_SENDING,
  SAMPLE_WITHDRAW_QUOTE,
  WALLET_READS,
} from "./fixtures";

export const dynamic = "force-dynamic";

/**
 * THE WALLET WITH SAMPLE DATA (D81; the founder, 7 October: "Build the front
 * end and the wallet design, let me see it, even though the key is not
 * connected"). The real Wallet components drawn with sample reads, so every
 * screen and state can be reviewed beside the governing reference.
 * Development only; the preview layout 404s it everywhere else, and every
 * figure here is invented and labelled so on the page.
 *
 *   ?state=overview (default) | stale | unreachable | empty | not-connected | onboarding | error | loading
 *          transactions | transactions-received | transactions-added | transactions-sent | transactions-withdrawals
 *          transactions-empty | transactions-not-connected
 *          settings
 *          add | add-confirm | add-not-connected | add-unavailable
 *          send | send-filled | send-confirm | send-waiting | send-not-connected | send-unavailable
 *          withdraw | withdraw-filled | withdraw-confirm | withdraw-unavailable
 *
 * The older names stay working: `live` and `quiet` (the overview, full and
 * empty) and `not-live` (not connected).
 */
const ALIAS: Record<string, string> = { live: "overview", quiet: "empty", "not-live": "not-connected" };

const at = (state: string) => `/preview/money/wallet?state=${state}`;
const LINKS: WalletLinks = {
  home: "/preview/money",
  overview: at("overview"),
  transactions: at("transactions"),
  settings: at("settings"),
  add: at("add"),
  send: at("send"),
  withdraw: at("withdraw"),
};

const AVAILABLE = FIGURES.available.minor;

export default async function WalletSample({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  if (!previewHarnessIsOpen(process.env)) notFound();
  const raw = (await searchParams).state ?? "overview";
  const state = ALIAS[raw] ?? raw;

  return (
    /* The member shell's own content wrapper, so the Wallet is judged with
       the gutter and the wash it has in the product. */
    <div className="nf-soft-top min-h-dvh">
      <div className="nf-shell nf-page-stage py-section-tight">
        <p role="note" className="nf-caption mb-xs text-center text-[var(--nf-content-muted)]" data-testid="wallet-sample-note">
          Sample data for design review. No figure here is real.
        </p>
        {state === "loading" ? <LoadingWallet /> : <main className="nf-page">{screenFor(state)}</main>}
      </div>
    </div>
  );
}

function screenFor(state: string) {
  const live = WALLET_READS.live!;
  const off = WALLET_READS["not-connected"]!;
  const view = (read: keyof typeof WALLET_READS, screen: WalletScreen = "overview", filter?: "received" | "added" | "sent" | "withdrawals") => (
    <BalanceView read={WALLET_READS[read]!} locale="en" screen={screen} links={LINKS} filter={filter} />
  );

  switch (state) {
    case "stale":
    case "unreachable":
    case "empty":
    case "not-connected":
    case "onboarding":
    case "error":
      return view(state);
    case "transactions":
      return view("live", "transactions");
    case "transactions-received":
    case "transactions-added":
    case "transactions-sent":
    case "transactions-withdrawals":
      return view("live", "transactions", state.slice("transactions-".length) as "received" | "added" | "sent" | "withdrawals");
    case "transactions-empty":
      return view("empty", "transactions");
    case "transactions-not-connected":
      return view("not-connected", "transactions");
    case "settings":
      return <BalanceView read={live} locale="en" screen="settings" links={LINKS} />;

    case "add":
      return <AddMoneyScreen availableMinor={AVAILABLE} connected locale="en" links={LINKS} />;
    case "add-confirm":
      return <AddMoneyScreen availableMinor={AVAILABLE} connected locale="en" links={LINKS} initial={{ step: "confirm", amount: "50000" }} />;
    case "add-not-connected":
      return <BalanceView read={off} locale="en" screen="add" links={LINKS} />;
    case "add-unavailable":
      return <AddMoneyScreen availableMinor={null} connected={false} locale="en" links={LINKS} initial={{ step: "unavailable", amount: "50000" }} />;

    case "send":
      return <SendScreen availableMinor={AVAILABLE} connected locale="en" links={LINKS} />;
    case "send-filled":
      return <SendScreen availableMinor={AVAILABLE} connected locale="en" links={LINKS} initial={{ amount: "45000", recipient: SAMPLE_RECIPIENT, reason: "Rent" }} />;
    case "send-confirm":
      return (
        <SendScreen
          availableMinor={AVAILABLE}
          connected
          locale="en"
          links={LINKS}
          initial={{ step: "review", amount: "45000", recipient: SAMPLE_RECIPIENT, reason: "Rent", quote: SAMPLE_SEND_QUOTE }}
        />
      );
    case "send-waiting":
      return <SendScreen availableMinor={AVAILABLE} connected locale="en" links={LINKS} initial={{ step: "waiting", movement: SAMPLE_SENDING }} />;
    case "send-not-connected":
      return <BalanceView read={off} locale="en" screen="send" links={LINKS} />;
    case "send-unavailable":
      return <SendScreen availableMinor={null} connected={false} locale="en" links={LINKS} initial={{ step: "unavailable", amount: "45000" }} />;

    case "withdraw":
      return <WithdrawScreen availableMinor={AVAILABLE} connected locale="en" links={LINKS} />;
    case "withdraw-filled":
      return <WithdrawScreen availableMinor={AVAILABLE} connected locale="en" links={LINKS} initial={{ amount: "250000", account: SAMPLE_ACCOUNT }} />;
    case "withdraw-confirm":
      return <WithdrawScreen availableMinor={AVAILABLE} connected locale="en" links={LINKS} initial={{ step: "review", amount: "250000", account: SAMPLE_ACCOUNT, quote: SAMPLE_WITHDRAW_QUOTE }} />;
    case "withdraw-unavailable":
      return <WithdrawScreen availableMinor={null} connected={false} locale="en" links={LINKS} initial={{ step: "unavailable", amount: "250000" }} />;

    default:
      return view("live");
  }
}
