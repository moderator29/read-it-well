import "server-only";
import type { WalletRepository, WalletSummary } from "./types";

/**
 * Wallet data access.
 *
 * Selected by NF_DATA_SOURCE, same contract as the listing and agent
 * repositories. The seed wallet is a genuinely empty wallet: zero balance,
 * no history, because money in this product is real integer kobo or it is
 * nothing at all, never an invented number (Master Rules 8 and 50). Nothing
 * here needs a label because nothing here is fabricated.
 *
 * The real repository reads public.wallet_balances and wallet_entries under
 * Row Level Security for the signed-in user, and creates the wallet row
 * lazily through the service role on first money movement, matching the
 * migration's documented lazy-creation contract.
 */

const EMPTY_WALLET: WalletSummary = {
  id: null,
  balanceMinor: 0,
  currency: "NGN",
  entries: [],
};

class SeedWalletRepository implements WalletRepository {
  readonly isSeed = true;
  async getWallet(): Promise<WalletSummary> {
    return EMPTY_WALLET;
  }
}

class ApiWalletRepository implements WalletRepository {
  readonly isSeed = false;
  async getWallet(): Promise<WalletSummary> {
    throw new Error("NF_DATA_SOURCE=api but the wallet API is not implemented yet.");
  }
}

export function getWalletRepository(): WalletRepository {
  return process.env.NF_DATA_SOURCE === "api"
    ? new ApiWalletRepository()
    : new SeedWalletRepository();
}
